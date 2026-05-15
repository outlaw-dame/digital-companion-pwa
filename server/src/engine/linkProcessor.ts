/**
 * Link Processor
 *
 * Three-stage pipeline for every URL found in user input:
 *
 *   1. EXTRACT   — regex-based URL detection, dedup, cap at MAX_URLS_PER_MSG
 *   2. SANITIZE  — protocol allow-list + SSRF guard (block private/loopback IPs)
 *   3. SAFE BROWSING — batch Google Safe Browsing v4 check (skipped if no key)
 *   4. OPEN GRAPH  — HEAD-only fetch (64 KB cap, 5 s timeout), parse OG/Twitter meta
 *
 * All stages degrade gracefully:
 *   - No Safe Browsing key → assume URLs are safe, log a warning once
 *   - OG fetch fails → return minimal preview with domain only
 *   - Everything fails → return empty array, never throw
 *
 * SSRF protection:
 *   - Only https:// URLs are followed for OG fetch
 *   - Loopback, private, and link-local address ranges are blocked
 *   - Redirects are not followed (fetch redirect: "error")
 */

import type { LinkPreview } from "../types/core";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_URLS_PER_MSG   = 5;
const OG_FETCH_TIMEOUT   = 5_000;   // ms
const OG_MAX_BYTES       = 65_536;  // 64 KB — enough for any <head>
const SAFE_BROWSING_URL  = "https://safebrowsing.googleapis.com/v4/threatMatches:find";

const THREAT_TYPES = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE",
  "POTENTIALLY_HARMFUL_APPLICATION",
];

// Non-backtracking URL extractor — no nested quantifiers, no ReDoS risk.
// Validation is left to new URL() in sanitizeUrl(); this just finds candidates.
const URL_RE = /https?:\/\/[^\s\x00-\x1f"'<>\\]{4,2000}/g;

// Strip trailing punctuation that commonly attaches to URLs in prose.
function trimTrailingPunct(s: string): string {
  return s.replace(/[.,;:!?)\]]+$/, "");
}

// ─── Sanitization ─────────────────────────────────────────────────────────────

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
  "169.254.169.254",  // AWS/GCP metadata endpoint as hostname
]);

/**
 * Attempts to parse a hostname as IPv4 in any encoding:
 *   - standard dotted-decimal  (192.168.1.1)
 *   - pure decimal integer     (3232235777)
 *   - octal per-octet          (0300.0250.01.01)
 *   - hex per-octet            (0xC0.0xA8.0x01.0x01)
 * Returns the dotted-decimal string, or null if it's not an IPv4 address.
 */
function normalizeIPv4(host: string): string | null {
  // Standard dotted decimal (possibly with trailing dot from DNS)
  const bare = host.replace(/\.$/, "");

  if (/^\d+\.\d+\.\d+\.\d+$/.test(bare)) return bare;

  // Pure integer (decimal) — e.g. 2130706433 = 127.0.0.1
  if (/^\d+$/.test(bare)) {
    const n = parseInt(bare, 10);
    if (!Number.isFinite(n) || n < 0 || n > 0xFFFFFFFF) return null;
    return [n >>> 24, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF].join(".");
  }

  // Per-octet octal / hex — e.g. 0177.0.0.1 or 0xC0.0xA8.0x01.0x01
  if (/^(0[xX]?[\da-fA-F]+\.){3}0[xX]?[\da-fA-F]+$/.test(bare)) {
    try {
      const parts = bare.split(".").map((p) => {
        if (p.startsWith("0x") || p.startsWith("0X")) return parseInt(p, 16);
        if (p.startsWith("0") && p.length > 1) return parseInt(p, 8);
        return parseInt(p, 10);
      });
      if (parts.some((p) => !Number.isFinite(p) || p < 0 || p > 255)) return null;
      return parts.join(".");
    } catch {
      return null;
    }
  }

  return null;
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p) || p < 0 || p > 255)) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 127 ||                            // loopback 127.0.0.0/8
    a === 10 ||                             // RFC 1918 10.0.0.0/8
    (a === 172 && b >= 16 && b <= 31) ||    // RFC 1918 172.16.0.0/12
    (a === 192 && b === 168) ||             // RFC 1918 192.168.0.0/16
    (a === 169 && b === 254) ||             // link-local 169.254.0.0/16
    (a === 100 && b >= 64 && b <= 127) ||   // CGNAT 100.64.0.0/10
    a === 0                                 // 0.0.0.0/8
  );
}

function isPrivateIPv6(addr: string): boolean {
  const a = addr.toLowerCase().replace(/^\[|\]$/g, "");

  if (a === "::1" || a === "::") return true;

  // IPv4-mapped ::ffff:x or ::ffff:x.x.x.x
  if (a.startsWith("::ffff:")) {
    const v4part = a.slice(7);
    const dotted = normalizeIPv4(v4part) ?? (() => {
      // Compact hex like ::ffff:7f000001
      if (/^[\da-f]{8}$/.test(v4part)) {
        const n = parseInt(v4part, 16);
        return [n >>> 24, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF].join(".");
      }
      return null;
    })();
    return dotted ? isPrivateIPv4(dotted) : true; // conservative
  }

  // ULA fc00::/7 (fc** and fd**)
  if (/^f[cd]/i.test(a)) return true;

  // Link-local fe80::/10 (fe80 through febf)
  if (/^fe[89ab]/i.test(a)) return true;

  return false;
}

function isPrivateHost(hostname: string): boolean {
  if (BLOCKED_HOSTNAMES.has(hostname)) return true;

  // Strip IPv6 brackets for parsing
  const isIPv6Bracketed = hostname.startsWith("[") && hostname.endsWith("]");
  if (isIPv6Bracketed) return isPrivateIPv6(hostname.slice(1, -1));

  // Contains colon → treat as IPv6
  if (hostname.includes(":")) return isPrivateIPv6(hostname);

  // Try as IPv4 (various encodings)
  const ipv4 = normalizeIPv4(hostname);
  if (ipv4) return isPrivateIPv4(ipv4);

  return false;
}

interface SanitizeResult {
  url: URL;
  ok: boolean;
  reason?: string;
}

function sanitizeUrl(raw: string): SanitizeResult {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { url: new URL("about:blank"), ok: false, reason: "invalid_url" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { url, ok: false, reason: "unsafe_protocol" };
  }

  const host = url.hostname.toLowerCase();
  if (isPrivateHost(host)) {
    return { url, ok: false, reason: "private_host" };
  }

  // Normalise: strip credentials, force lowercase hostname
  url.username = "";
  url.password = "";
  url.hostname = host;

  return { url, ok: true };
}

// ─── URL Extraction ───────────────────────────────────────────────────────────

export function extractUrls(text: string): string[] {
  const raw = Array.from(
    new Set((text.match(URL_RE) ?? []).map(trimTrailingPunct)),
  );
  return raw.slice(0, MAX_URLS_PER_MSG);
}

// ─── Google Safe Browsing v4 ──────────────────────────────────────────────────

let _warnedNoBrowsingKey = false;

/**
 * Returns a map: url → threat type string, or null if safe.
 * If the API key is absent the map contains null for every URL (assume safe).
 */
async function checkSafeBrowsing(
  urls: URL[],
  apiKey: string | undefined,
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>(urls.map((u) => [u.href, null]));

  if (!apiKey) {
    if (!_warnedNoBrowsingKey) {
      console.warn(
        "[linkProcessor] GOOGLE_SAFE_BROWSING_API_KEY not set — " +
        "Safe Browsing check skipped. URLs assumed safe.",
      );
      _warnedNoBrowsingKey = true;
    }
    return result;
  }

  try {
    const res = await fetch(`${SAFE_BROWSING_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "ane-companion", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: THREAT_TYPES,
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: urls.map((u) => ({ url: u.href })),
        },
      }),
      signal: AbortSignal.timeout(6_000),
    });

    if (!res.ok) {
      console.error(`[linkProcessor] Safe Browsing API ${res.status} — assuming safe`);
      return result;
    }

    const data = await res.json() as {
      matches?: { threatType: string; threat: { url: string } }[];
    };

    for (const match of data.matches ?? []) {
      result.set(match.threat.url, match.threatType);
    }
  } catch (err) {
    console.error("[linkProcessor] Safe Browsing check failed:", err);
  }

  return result;
}

// ─── Open Graph Fetcher ───────────────────────────────────────────────────────

interface OGMeta {
  title?: string;
  description?: string;
  imageUrl?: string;
}

function parseOGMeta(html: string, baseUrl: URL): OGMeta {
  // Extracts <meta property/name="key" content="val"> in both attribute orders
  const getMeta = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const escaped = key.replace(":", "\\:");
      const patterns = [
        new RegExp(
          `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']{1,500})["']`,
          "i",
        ),
        new RegExp(
          `<meta[^>]+content=["']([^"']{1,500})["'][^>]+(?:property|name)=["']${escaped}["']`,
          "i",
        ),
      ];
      for (const re of patterns) {
        const m = html.match(re);
        if (m?.[1]) return m[1].trim();
      }
    }
    return undefined;
  };

  const rawTitle =
    getMeta("og:title", "twitter:title") ??
    html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1];

  const rawImage = getMeta("og:image", "twitter:image");

  // Resolve relative image URLs and enforce safe scheme
  let imageUrl: string | undefined;
  if (rawImage) {
    try {
      const resolved = new URL(rawImage, baseUrl);
      if (resolved.protocol === "https:" || resolved.protocol === "http:") {
        imageUrl = resolved.href;
      }
    } catch {
      imageUrl = undefined;
    }
  }

  return {
    title: rawTitle?.trim().replace(/\s+/g, " ").slice(0, 200),
    description: getMeta("og:description", "twitter:description", "description")
      ?.replace(/\s+/g, " ")
      .slice(0, 300),
    imageUrl,
  };
}

async function fetchOpenGraph(url: URL): Promise<OGMeta> {
  // OG fetch only over HTTPS to avoid leaking server-side plain-text requests
  if (url.protocol !== "https:") return {};

  try {
    const res = await fetch(url.href, {
      headers: {
        "User-Agent":
          "ANE-Companion/1.0 (link preview; +https://github.com/outlaw-dame/digital-companion-pwa)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en",
      },
      redirect: "error",           // SSRF: don't follow redirects blindly
      signal: AbortSignal.timeout(OG_FETCH_TIMEOUT),
    });

    if (!res.ok) return {};

    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (contentType !== "text/html" && contentType !== "application/xhtml+xml") return {};

    // Stream only up to OG_MAX_BYTES of the response body
    const reader = res.body?.getReader();
    if (!reader) return {};

    let bytes = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      bytes += value.byteLength;
      if (bytes >= OG_MAX_BYTES) {
        reader.cancel();
        break;
      }
    }

    const html = new TextDecoder().decode(
      chunks.reduce((acc, c) => {
        const merged = new Uint8Array(acc.length + c.length);
        merged.set(acc);
        merged.set(c, acc.length);
        return merged;
      }, new Uint8Array()),
    );

    // Only parse up to </head> — no need to scan the body
    const headEnd = html.toLowerCase().indexOf("</head>");
    const head = headEnd >= 0 ? html.slice(0, headEnd) : html.slice(0, 8_000);

    return parseOGMeta(head, url);
  } catch {
    return {};
  }
}

// ─── Public Orchestrator ──────────────────────────────────────────────────────

export async function processLinks(
  text: string,
  safeBrowsingKey?: string,
): Promise<LinkPreview[]> {
  const rawUrls = extractUrls(text);
  if (rawUrls.length === 0) return [];

  // Stage 1: sanitize
  const sanitized = rawUrls
    .map((raw) => ({ raw, ...sanitizeUrl(raw) }))
    .filter((r) => r.ok);

  if (sanitized.length === 0) return [];

  // Stage 2: Safe Browsing (batch)
  const threatMap = await checkSafeBrowsing(
    sanitized.map((r) => r.url),
    safeBrowsingKey,
  );

  // Stage 3: OG fetch (only safe URLs, run concurrently)
  const previews = await Promise.all(
    sanitized.map(async ({ url }): Promise<LinkPreview> => {
      const threatType = threatMap.get(url.href) ?? null;
      const isSafe = threatType === null;
      const domain = url.hostname.replace(/^www\./, "");
      const favicon = `https://${url.hostname}/favicon.ico`;

      if (!isSafe) {
        return {
          url: url.href,
          domain,
          favicon,
          isSafe: false,
          threatType: threatType ?? undefined,
          fetchedAt: new Date().toISOString(),
        };
      }

      const og = await fetchOpenGraph(url);

      return {
        url: url.href,
        domain,
        favicon,
        title: og.title,
        description: og.description,
        imageUrl: og.imageUrl,
        isSafe: true,
        fetchedAt: new Date().toISOString(),
      };
    }),
  );

  return previews;
}

/**
 * Formats safe link previews as a compact context block for AI prompts.
 * Injected into the user prompt so the entity has awareness of shared links.
 */
export function formatLinksForPrompt(previews: LinkPreview[]): string {
  const safe = previews.filter((p) => p.isSafe && (p.title || p.description));
  if (safe.length === 0) return "";

  const lines = safe.map((p) => {
    const parts = [`[Link: ${p.domain}]`];
    if (p.title) parts.push(`Title: "${p.title}"`);
    if (p.description) parts.push(`Summary: "${p.description}"`);
    return parts.join(" — ");
  });

  return `\nSHARED LINKS:\n${lines.join("\n")}`;
}
