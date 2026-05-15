/**
 * Feed Processor
 *
 * Parses RSS 2.0, Atom 1.0, JSON Feed 1.x, and RDF/RSS 1.0 feeds.
 * No external dependencies — uses Bun native APIs only.
 *
 * Public surface:
 *   detectFeedFormat  — sniff content-type / body to identify format
 *   parseFeed         — parse a body string given its format
 *   fetchAndParseFeed — fetch a URL and parse it
 *   discoverFeed      — discover a feed for any website URL
 *   processFeedsFromText — extract URLs from text and return feed data
 *   formatFeedsForPrompt — format feed data for AI prompt injection
 *
 * SSRF protection mirrors linkProcessor.ts:
 *   - Only http/https URLs are fetched
 *   - Private/loopback/link-local addresses are blocked
 *   - Redirects are followed manually with re-validation at each hop
 *   - Response body is capped at 512 KB
 *   - Fetch timeout: 8 s
 */

import { sanitizeExternalText, wrapExternalContext } from "../utils/promptSanitizer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeedFormat = "rss" | "atom" | "json" | "rdf";

export interface FeedItem {
  title: string | null;
  link: string | null;
  description: string | null;       // plain text, max 500 chars
  publishedAt: string | null;       // ISO timestamp or null
  author: string | null;
}

export interface FeedContent {
  url: string;                      // original URL
  format: FeedFormat;
  title: string | null;
  description: string | null;
  siteUrl: string | null;
  items: FeedItem[];                // capped at 10 items
  fetchedAt: string;                // ISO timestamp
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ITEMS        = 10;
const MAX_DESCRIPTION  = 500;
const MAX_BODY_BYTES   = 524_288;   // 512 KB
const FETCH_TIMEOUT_MS = 8_000;
const FEEDSEARCH_TIMEOUT_MS = 5_000;

const URL_RE = /https?:\/\/[^\s\x00-\x1f"'<>\\]{4,2000}/g;

function trimTrailingPunct(s: string): string {
  return s.replace(/[.,;:!?)\]]+$/, "");
}

// ─── SSRF Guard (inlined, mirrors linkProcessor.ts) ───────────────────────────

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
  "169.254.169.254",
]);

function normalizeIPv4(host: string): string | null {
  const bare = host.replace(/\.$/, "");

  if (/^\d+\.\d+\.\d+\.\d+$/.test(bare)) return bare;

  if (/^\d+$/.test(bare)) {
    const n = parseInt(bare, 10);
    if (!Number.isFinite(n) || n < 0 || n > 0xFFFFFFFF) return null;
    return [n >>> 24, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF].join(".");
  }

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
    a === 127 ||
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a === 0
  );
}

function isPrivateIPv6(addr: string): boolean {
  const a = addr.toLowerCase().replace(/^\[|\]$/g, "");
  if (a === "::1" || a === "::") return true;

  if (a.startsWith("::ffff:")) {
    const v4part = a.slice(7);
    const dotted = normalizeIPv4(v4part) ?? (() => {
      if (/^[\da-f]{8}$/.test(v4part)) {
        const n = parseInt(v4part, 16);
        return [n >>> 24, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF].join(".");
      }
      return null;
    })();
    return dotted ? isPrivateIPv4(dotted) : true;
  }

  if (/^f[cd]/i.test(a)) return true;
  if (/^fe[89ab]/i.test(a)) return true;
  return false;
}

function isPrivateHost(hostname: string): boolean {
  if (BLOCKED_HOSTNAMES.has(hostname)) return true;

  const isIPv6Bracketed = hostname.startsWith("[") && hostname.endsWith("]");
  if (isIPv6Bracketed) return isPrivateIPv6(hostname.slice(1, -1));
  if (hostname.includes(":")) return isPrivateIPv6(hostname);

  const ipv4 = normalizeIPv4(hostname);
  if (ipv4) return isPrivateIPv4(ipv4);

  return false;
}

function isSafeUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  return !isPrivateHost(u.hostname.toLowerCase());
}

function isSafeUrlObj(u: URL): boolean {
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  return !isPrivateHost(u.hostname.toLowerCase());
}

/**
 * Fetch a URL following redirects manually, re-validating each redirect target
 * against the SSRF blocklist before following. Using `redirect: "manual"` so
 * we never contact a blocked host even transiently.
 */
const MAX_REDIRECTS = 5;

async function safeFetch(
  url: URL,
  init: RequestInit,
): Promise<Response> {
  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current.href, { ...init, redirect: "manual" });

    // Non-redirect: return as-is
    if (res.status < 300 || res.status >= 400) return res;

    // Redirect: validate target before following
    if (hop === MAX_REDIRECTS) throw new Error("Too many redirects");

    const location = res.headers.get("location");
    if (!location) throw new Error("Redirect missing Location header");

    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      throw new Error("Invalid redirect Location value");
    }

    // Strip credentials that could have been injected via the Location header
    next.username = "";
    next.password = "";

    if (!isSafeUrlObj(next)) {
      throw new Error(`Redirect to blocked host: ${next.hostname}`);
    }

    current = next;
  }

  throw new Error("Too many redirects");
}

// ─── XML Helpers ──────────────────────────────────────────────────────────────

/**
 * Decode XML/HTML entities: named (&amp; &lt; &gt; &quot; &apos;) and
 * numeric (&#nnn; and &#xhex;).
 */
export function unescapeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const cp = parseInt(hex, 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : "";
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const cp = parseInt(dec, 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : "";
    })
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

/**
 * Strip CDATA wrappers and XML comments, decode entities, collapse whitespace.
 */
export function cleanXmlText(s: string): string {
  // Unwrap CDATA sections
  let out = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  // Remove XML/HTML comments
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  // Strip remaining HTML/XML tags
  out = out.replace(/<[^>]+>/g, " ");
  // Decode entities
  out = unescapeXml(out);
  // Remove NUL and ASCII control characters (except tab, newline, carriage return)
  out = out.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  // Collapse whitespace and trim
  return out.replace(/\s+/g, " ").trim();
}

/**
 * Return the text content of the first matching element.
 * Matches <tag>, <ns:tag>, <tag attr="...">, <ns:tag attr="...">.
 * Does NOT handle self-closing tags (those have no content).
 */
export function tagContent(xml: string, localName: string): string | null {
  // Match both namespaced and bare versions, with optional attributes
  const re = new RegExp(
    `<(?:[a-zA-Z0-9_-]+:)?${localName}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[a-zA-Z0-9_-]+:)?${localName}>`,
    "i",
  );
  const m = xml.match(re);
  return m ? m[1] : null;
}

/**
 * Extract the value of an attribute from an opening tag string.
 * Handles single-quoted, double-quoted values.
 */
export function tagAttr(openTag: string, attrName: string): string | null {
  // Double-quoted
  const dq = new RegExp(`\\b${attrName}\\s*=\\s*"([^"]*)"`, "i");
  const dqm = openTag.match(dq);
  if (dqm) return dqm[1];
  // Single-quoted
  const sq = new RegExp(`\\b${attrName}\\s*=\\s*'([^']*)'`, "i");
  const sqm = openTag.match(sq);
  if (sqm) return sqm[1];
  return null;
}

/**
 * Return all text segments enclosed by <tag>…</tag> (handles namespaced variants).
 * Linear scan — does not attempt full XML parsing.
 */
export function allTagSegments(xml: string, localName: string): string[] {
  // Build a regex that matches a full element (opening tag + content + closing tag).
  // We use a non-greedy match so we capture each element individually.
  const re = new RegExp(
    `<(?:[a-zA-Z0-9_-]+:)?${localName}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[a-zA-Z0-9_-]+:)?${localName}>`,
    "gi",
  );
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    // Return the full matched segment (including tags) so callers can inspect attributes
    results.push(m[0]);
  }
  return results;
}

// ─── Sanitizers ───────────────────────────────────────────────────────────────

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function sanitizeString(s: string | null | undefined, maxLen: number): string | null {
  if (s == null) return null;
  // Remove NUL and control characters
  const clean = s
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > 0 ? clean.slice(0, maxLen) : null;
}

/**
 * Attempt to normalise a date-like string to an ISO timestamp.
 * Returns null if the date is not parseable or the result is not a valid date.
 */
function toIsoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  if (!cleaned) return null;
  try {
    const d = new Date(cleaned);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

// ─── Format Detection ─────────────────────────────────────────────────────────

/**
 * Detect feed format from Content-Type header and/or body text.
 * Returns null if the content does not appear to be a supported feed.
 */
export function detectFeedFormat(body: string, contentType: string): FeedFormat | null {
  const ct = contentType.toLowerCase().split(";")[0].trim();

  // JSON Feed: explicit content-type or version field
  if (
    ct === "application/feed+json" ||
    ct === "application/json" ||
    ct === "text/json"
  ) {
    if (
      body.includes('"version"') &&
      body.includes("jsonfeed.org")
    ) {
      return "json";
    }
  }

  if (ct === "application/feed+json") return "json";

  // XML-based feeds — look at root element
  // Strip BOM and leading whitespace
  const trimmed = body.replace(/^﻿/, "").trimStart();

  // Must start with XML declaration or a tag
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    // Could be JSON Feed without correct content-type
    if (body.includes('"version"') && body.includes("jsonfeed.org")) {
      return "json";
    }
    return null;
  }

  // Find the first real element (skip XML declaration and DOCTYPE)
  const firstTag = trimmed.match(/<([^\s!?][^>]*?)(?:\s|\/?>)/);
  if (!firstTag) return null;

  const tag = firstTag[1].toLowerCase();

  if (tag === "rss" || tag.startsWith("rss ")) return "rss";

  if (
    tag === "feed" ||
    tag.startsWith("feed ") ||
    tag.startsWith("atom:feed") ||
    trimmed.includes('xmlns="http://www.w3.org/2005/Atom"') ||
    trimmed.includes("xmlns:atom")
  ) {
    // Confirm it's actually Atom
    if (trimmed.includes("http://www.w3.org/2005/Atom")) return "atom";
    // Could still be an Atom feed with a <feed> root
    if (tag === "feed" || tag.startsWith("feed ")) return "atom";
  }

  if (
    tag === "rdf:rdf" ||
    tag.startsWith("rdf:rdf ") ||
    tag === "rdf" ||
    trimmed.includes("xmlns:rdf=") ||
    trimmed.includes("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
  ) {
    return "rdf";
  }

  // Content-type fallbacks
  if (ct === "application/rss+xml" || ct === "text/rss+xml") return "rss";
  if (ct === "application/atom+xml") return "atom";
  if (
    ct === "application/rdf+xml" ||
    ct === "text/xml" ||
    ct === "application/xml"
  ) {
    // Try body heuristics one more time
    if (body.includes("<rss")) return "rss";
    if (body.includes("<feed") && body.includes("Atom")) return "atom";
    if (body.includes("rdf:RDF")) return "rdf";
  }

  return null;
}

// ─── RSS 2.0 Parser ───────────────────────────────────────────────────────────

function parseRss(body: string, sourceUrl: string): FeedContent | null {
  try {
    // Find channel
    const channelMatch = body.match(/<channel[\s>]([\s\S]*?)<\/channel>/i);
    const channel = channelMatch ? channelMatch[1] : body;

    // Channel-level meta (exclude items from consideration)
    const channelWithoutItems = channel.replace(/<item[\s>][\s\S]*?<\/item>/gi, "");

    const feedTitle = sanitizeString(
      cleanXmlText(tagContent(channelWithoutItems, "title") ?? ""),
      200,
    );
    const feedDesc = sanitizeString(
      cleanXmlText(tagContent(channelWithoutItems, "description") ?? ""),
      500,
    );
    const feedLink = sanitizeString(
      cleanXmlText(tagContent(channelWithoutItems, "link") ?? ""),
      500,
    );

    // Items
    const itemSegments = allTagSegments(channel, "item").slice(0, MAX_ITEMS);
    const items: FeedItem[] = itemSegments.map((seg): FeedItem => {
      const title = sanitizeString(
        cleanXmlText(tagContent(seg, "title") ?? ""),
        200,
      );

      // <link> in RSS is often a text node (not self-closing)
      let link = cleanXmlText(tagContent(seg, "link") ?? "");
      // Fallback to <guid> if it looks like a URL
      if (!link) {
        const guid = cleanXmlText(tagContent(seg, "guid") ?? "");
        if (guid.startsWith("http")) link = guid;
      }

      const rawDesc =
        tagContent(seg, "description") ??
        tagContent(seg, "content:encoded") ??
        tagContent(seg, "encoded") ??
        "";
      const description = sanitizeString(
        stripHtml(cleanXmlText(rawDesc)).slice(0, MAX_DESCRIPTION),
        MAX_DESCRIPTION,
      );

      const pubDateRaw =
        tagContent(seg, "pubDate") ??
        tagContent(seg, "pubdate") ??
        tagContent(seg, "dc:date") ??
        null;
      const publishedAt = toIsoDate(pubDateRaw ? cleanXmlText(pubDateRaw) : null);

      const authorRaw =
        tagContent(seg, "author") ??
        tagContent(seg, "dc:creator") ??
        null;
      const author = sanitizeString(
        authorRaw ? cleanXmlText(authorRaw) : null,
        200,
      );

      return {
        title,
        link: sanitizeString(link, 500),
        description,
        publishedAt,
        author,
      };
    });

    return {
      url: sourceUrl,
      format: "rss",
      title: feedTitle,
      description: feedDesc,
      siteUrl: feedLink,
      items,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[feedProcessor] RSS parse error:", err);
    return null;
  }
}

// ─── Atom 1.0 Parser ──────────────────────────────────────────────────────────

/**
 * For Atom <link> elements we need to check the href attribute, since the
 * canonical form is <link href="..." rel="alternate"/>.
 * Also handle text content as fallback.
 */
function atomLinkHref(segment: string): string | null {
  // Find the <link> opening tag
  const linkTagMatch = segment.match(/<(?:[a-zA-Z0-9_-]+:)?link(\s[^>]*)?\/?>/i);
  if (!linkTagMatch) return null;
  const openTag = linkTagMatch[0];
  const rel = tagAttr(openTag, "rel") ?? "alternate";
  if (rel !== "alternate" && rel !== "") return null;
  return tagAttr(openTag, "href");
}

function parseAtom(body: string, sourceUrl: string): FeedContent | null {
  try {
    // Channel meta — strip entries first
    const bodyWithoutEntries = body.replace(/<entry[\s>][\s\S]*?<\/entry>/gi, "");

    const feedTitle = sanitizeString(
      cleanXmlText(tagContent(bodyWithoutEntries, "title") ?? ""),
      200,
    );
    const feedDesc = sanitizeString(
      cleanXmlText(
        tagContent(bodyWithoutEntries, "subtitle") ??
        tagContent(bodyWithoutEntries, "description") ??
        "",
      ),
      500,
    );

    // Feed-level link (alternate)
    const feedLinkHref = atomLinkHref(bodyWithoutEntries);
    const feedLink = sanitizeString(feedLinkHref, 500);

    const entrySegments = allTagSegments(body, "entry").slice(0, MAX_ITEMS);
    const items: FeedItem[] = entrySegments.map((seg): FeedItem => {
      const title = sanitizeString(
        cleanXmlText(tagContent(seg, "title") ?? ""),
        200,
      );

      // Atom link is usually an attribute
      const link = sanitizeString(atomLinkHref(seg), 500);

      // summary preferred, fallback to content
      const rawDesc =
        tagContent(seg, "summary") ??
        tagContent(seg, "content") ??
        "";
      const description = sanitizeString(
        stripHtml(cleanXmlText(rawDesc)).slice(0, MAX_DESCRIPTION),
        MAX_DESCRIPTION,
      );

      const publishedRaw =
        tagContent(seg, "published") ??
        tagContent(seg, "updated") ??
        tagContent(seg, "modified") ??
        null;
      const publishedAt = toIsoDate(publishedRaw ? cleanXmlText(publishedRaw) : null);

      // <author><name>...</name></author>
      const authorBlock = tagContent(seg, "author");
      const authorName = authorBlock
        ? cleanXmlText(tagContent(authorBlock, "name") ?? authorBlock)
        : cleanXmlText(tagContent(seg, "dc:creator") ?? "");
      const author = sanitizeString(authorName || null, 200);

      return { title, link, description, publishedAt, author };
    });

    return {
      url: sourceUrl,
      format: "atom",
      title: feedTitle,
      description: feedDesc,
      siteUrl: feedLink,
      items,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[feedProcessor] Atom parse error:", err);
    return null;
  }
}

// ─── JSON Feed 1.x Parser ─────────────────────────────────────────────────────

interface JsonFeedRaw {
  version?: string;
  title?: string;
  description?: string;
  home_page_url?: string;
  feed_url?: string;
  items?: JsonFeedItemRaw[];
}

interface JsonFeedItemRaw {
  id?: string;
  url?: string;
  title?: string;
  summary?: string;
  content_text?: string;
  content_html?: string;
  date_published?: string;
  date_modified?: string;
  authors?: { name?: string }[];
  author?: { name?: string };
}

function parseJsonFeed(body: string, sourceUrl: string): FeedContent | null {
  try {
    const data = JSON.parse(body) as JsonFeedRaw;

    if (!data.version || !data.version.includes("jsonfeed.org")) return null;

    const feedTitle = sanitizeString(data.title ?? null, 200);
    const feedDesc = sanitizeString(data.description ?? null, 500);
    const feedLink = sanitizeString(data.home_page_url ?? data.feed_url ?? null, 500);

    const rawItems = Array.isArray(data.items) ? data.items : [];
    const items: FeedItem[] = rawItems.slice(0, MAX_ITEMS).map((item): FeedItem => {
      const title = sanitizeString(item.title ?? null, 200);
      const link = sanitizeString(item.url ?? item.id ?? null, 500);

      const rawDesc =
        item.summary ??
        item.content_text ??
        (item.content_html ? stripHtml(item.content_html) : null) ??
        null;
      const description = sanitizeString(
        rawDesc ? rawDesc.slice(0, MAX_DESCRIPTION) : null,
        MAX_DESCRIPTION,
      );

      const publishedAt =
        toIsoDate(item.date_published) ??
        toIsoDate(item.date_modified);

      // authors array (v1.1) or author object (v1.0)
      const authorName =
        (Array.isArray(item.authors) && item.authors.length > 0
          ? item.authors[0]?.name
          : item.author?.name) ?? null;
      const author = sanitizeString(authorName, 200);

      return { title, link, description, publishedAt, author };
    });

    return {
      url: sourceUrl,
      format: "json",
      title: feedTitle,
      description: feedDesc,
      siteUrl: feedLink,
      items,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[feedProcessor] JSON Feed parse error:", err);
    return null;
  }
}

// ─── RDF/RSS 1.0 Parser ───────────────────────────────────────────────────────

function parseRdf(body: string, sourceUrl: string): FeedContent | null {
  try {
    // Channel is inside <channel> (or rss:channel), but items are siblings at RDF root level
    const channelMatch = body.match(/<(?:[a-zA-Z0-9_-]+:)?channel[\s>]([\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?channel>/i);
    const channelBody = channelMatch ? channelMatch[1] : "";

    const feedTitle = sanitizeString(
      cleanXmlText(tagContent(channelBody, "title") ?? ""),
      200,
    );
    const feedDesc = sanitizeString(
      cleanXmlText(tagContent(channelBody, "description") ?? ""),
      500,
    );
    const feedLink = sanitizeString(
      cleanXmlText(tagContent(channelBody, "link") ?? ""),
      500,
    );

    // Items are top-level in RDF (siblings of <channel>)
    const itemSegments = allTagSegments(body, "item").slice(0, MAX_ITEMS);
    const items: FeedItem[] = itemSegments.map((seg): FeedItem => {
      const title = sanitizeString(
        cleanXmlText(tagContent(seg, "title") ?? ""),
        200,
      );
      const link = sanitizeString(
        cleanXmlText(tagContent(seg, "link") ?? ""),
        500,
      );

      const rawDesc =
        tagContent(seg, "description") ??
        tagContent(seg, "content:encoded") ??
        "";
      const description = sanitizeString(
        stripHtml(cleanXmlText(rawDesc)).slice(0, MAX_DESCRIPTION),
        MAX_DESCRIPTION,
      );

      const pubDateRaw =
        tagContent(seg, "dc:date") ??
        tagContent(seg, "pubDate") ??
        tagContent(seg, "date") ??
        null;
      const publishedAt = toIsoDate(pubDateRaw ? cleanXmlText(pubDateRaw) : null);

      const authorRaw =
        tagContent(seg, "dc:creator") ??
        tagContent(seg, "author") ??
        null;
      const author = sanitizeString(authorRaw ? cleanXmlText(authorRaw) : null, 200);

      return { title, link, description, publishedAt, author };
    });

    return {
      url: sourceUrl,
      format: "rdf",
      title: feedTitle,
      description: feedDesc,
      siteUrl: feedLink,
      items,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[feedProcessor] RDF parse error:", err);
    return null;
  }
}

// ─── Public: parseFeed ────────────────────────────────────────────────────────

/**
 * Parse a feed body given its format. Returns null if parsing fails completely.
 */
export function parseFeed(
  body: string,
  format: FeedFormat,
  sourceUrl: string,
): FeedContent | null {
  switch (format) {
    case "rss":  return parseRss(body, sourceUrl);
    case "atom": return parseAtom(body, sourceUrl);
    case "json": return parseJsonFeed(body, sourceUrl);
    case "rdf":  return parseRdf(body, sourceUrl);
  }
}

// ─── Public: fetchAndParseFeed ────────────────────────────────────────────────

/**
 * Fetch a URL and parse it as a feed.
 * Returns null if the URL is not a feed or fetch fails.
 */
export async function fetchAndParseFeed(url: string): Promise<FeedContent | null> {
  if (!isSafeUrl(url)) {
    console.error(`[feedProcessor] Blocked unsafe URL: ${url}`);
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const res = await safeFetch(parsedUrl, {
      headers: {
        "User-Agent": "ANE-Companion/1.0",
        "Accept":
          "application/rss+xml, application/atom+xml, application/feed+json, application/json, application/rdf+xml, text/xml, application/xml, */*",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error(`[feedProcessor] HTTP ${res.status} fetching ${url}`);
      return null;
    }

    const finalUrl = url;
    const contentType = res.headers.get("content-type") ?? "";

    // Stream body with cap
    const reader = res.body?.getReader();
    if (!reader) return null;

    let bytes = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      bytes += value.byteLength;
      if (bytes >= MAX_BODY_BYTES) {
        reader.cancel();
        break;
      }
    }

    const body = new TextDecoder().decode(
      chunks.reduce((acc, c) => {
        const merged = new Uint8Array(acc.length + c.length);
        merged.set(acc);
        merged.set(c, acc.length);
        return merged;
      }, new Uint8Array()),
    );

    const format = detectFeedFormat(body, contentType);
    if (!format) {
      return null;
    }

    return parseFeed(body, format, finalUrl);
  } catch (err) {
    console.error(`[feedProcessor] Fetch error for ${url}:`, err);
    return null;
  }
}

// ─── FeedSearch.dev Fallback ──────────────────────────────────────────────────

async function feedSearchDev(url: string): Promise<FeedContent | null> {
  try {
    const apiUrl = `https://feedsearch.dev/api/v1/search?url=${encodeURIComponent(url)}`;
    const res = await fetch(apiUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "ANE-Companion/1.0",
      },
      signal: AbortSignal.timeout(FEEDSEARCH_TIMEOUT_MS),
    });

    if (!res.ok) return null;

    const data = await res.json() as { url?: string; title?: string }[];
    if (!Array.isArray(data) || data.length === 0) return null;

    const feedUrl = data[0]?.url;
    if (!feedUrl || typeof feedUrl !== "string") return null;

    return await fetchAndParseFeed(feedUrl);
  } catch (err) {
    console.error("[feedProcessor] FeedSearch.dev error:", err);
    return null;
  }
}

// ─── Public: discoverFeed ─────────────────────────────────────────────────────

/**
 * Given a website URL, discover its associated feed:
 *   1. Try the URL directly as a feed
 *   2. Fetch the HTML and look for <link rel="alternate" type="...+xml|+json">
 *   3. Fall back to FeedSearch.dev API
 * Returns null if no feed found.
 */
export async function discoverFeed(url: string): Promise<FeedContent | null> {
  if (!isSafeUrl(url)) {
    console.error(`[feedProcessor] Blocked unsafe URL in discoverFeed: ${url}`);
    return null;
  }

  // 1. Try directly
  const direct = await fetchAndParseFeed(url);
  if (direct) return direct;

  // 2. Parse HTML for <link rel="alternate">
  try {
    const parsedUrl2 = new URL(url);
    const res = await safeFetch(parsedUrl2, {
      headers: {
        "User-Agent": "ANE-Companion/1.0",
        "Accept": "text/html,application/xhtml+xml,*/*",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (res.ok) {
      const finalUrl = url;
      const contentType = (res.headers.get("content-type") ?? "").toLowerCase();

      if (contentType.includes("text/html") || contentType.includes("xhtml")) {
        // Read up to 64 KB — enough to find <head>
        const reader = res.body?.getReader();
        if (reader) {
          let bytes = 0;
          const chunks: Uint8Array[] = [];
          while (bytes < 65_536) {
            const { done, value } = await reader.read();
            if (done || !value) break;
            chunks.push(value);
            bytes += value.byteLength;
          }
          reader.cancel();

          const html = new TextDecoder().decode(
            chunks.reduce((acc, c) => {
              const merged = new Uint8Array(acc.length + c.length);
              merged.set(acc);
              merged.set(c, acc.length);
              return merged;
            }, new Uint8Array()),
          );

          // Find the <head> section
          const headEnd = html.toLowerCase().indexOf("</head>");
          const head = headEnd >= 0 ? html.slice(0, headEnd) : html.slice(0, 8_000);

          // Match <link rel="alternate" type="application/rss+xml|atom+xml|feed+json" href="...">
          const linkRe =
            /<link[^>]+rel=["']alternate["'][^>]+type=["']application\/(rss\+xml|atom\+xml|feed\+json|rdf\+xml)["'][^>]+href=["']([^"']+)["'][^>]*>/gi;
          const linkRe2 =
            /<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/(rss\+xml|atom\+xml|feed\+json|rdf\+xml)["'][^>]*>/gi;

          const candidates: string[] = [];
          let m: RegExpExecArray | null;

          while ((m = linkRe.exec(head)) !== null) {
            candidates.push(m[2]);
          }
          while ((m = linkRe2.exec(head)) !== null) {
            candidates.push(m[1]);
          }

          for (const href of candidates) {
            try {
              const resolved = new URL(href, finalUrl).href;
              if (isSafeUrl(resolved)) {
                const feed = await fetchAndParseFeed(resolved);
                if (feed) return feed;
              }
            } catch {
              // bad href — skip
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`[feedProcessor] HTML discovery error for ${url}:`, err);
  }

  // 3. FeedSearch.dev fallback
  return await feedSearchDev(url);
}

// ─── Public: processFeedsFromText ─────────────────────────────────────────────

/**
 * Parse all URLs in a text body, discover and fetch any feeds found.
 * Caps at 2 feeds per message. Returns empty array if nothing found.
 */
export async function processFeedsFromText(text: string): Promise<FeedContent[]> {
  const raw = Array.from(
    new Set((text.match(URL_RE) ?? []).map(trimTrailingPunct)),
  );

  const safeUrls = raw.filter(isSafeUrl);
  if (safeUrls.length === 0) return [];

  const results: FeedContent[] = [];

  for (const url of safeUrls) {
    if (results.length >= 2) break;
    try {
      const feed = await discoverFeed(url);
      if (feed) results.push(feed);
    } catch (err) {
      console.error(`[feedProcessor] processFeedsFromText error for ${url}:`, err);
    }
  }

  return results;
}

// ─── Public: formatFeedsForPrompt ─────────────────────────────────────────────

/**
 * Format feed contents as a compact context block for AI prompt injection.
 */
export function formatFeedsForPrompt(feeds: FeedContent[]): string {
  if (feeds.length === 0) return "";

  const blocks = feeds.map((feed) => {
    // Sanitize all external strings at formatting time (double-defence: parser
    // may have been run before sanitizer was introduced, cache hit path, etc.)
    const title       = feed.title       ? sanitizeExternalText(feed.title,       80)  : feed.url;
    const description = feed.description ? sanitizeExternalText(feed.description, 120) : null;

    const header = [
      `[Feed: ${title}]`,
      description ? `About: ${description}` : null,
      feed.siteUrl ? `Site: ${feed.siteUrl}` : null,
      `Format: ${feed.format.toUpperCase()}`,
    ]
      .filter(Boolean)
      .join(" — ");

    if (feed.items.length === 0) {
      return header + "\n  (no items)";
    }

    const itemLines = feed.items.map((item, i) => {
      const itemTitle  = item.title       ? sanitizeExternalText(item.title,       80)  : null;
      const itemAuthor = item.author      ? sanitizeExternalText(item.author,       40)  : null;
      const itemDesc   = item.description ? sanitizeExternalText(item.description, 200)  : null;

      const parts: string[] = [`  ${i + 1}.`];
      if (itemTitle)           parts.push(itemTitle);
      if (item.link)           parts.push(`<${item.link}>`);
      if (item.publishedAt)    parts.push(`(${item.publishedAt.slice(0, 10)})`);
      if (itemAuthor)          parts.push(`by ${itemAuthor}`);
      const line = parts.join(" ");
      return itemDesc ? `${line}\n     ${itemDesc}` : line;
    });

    return `${header}\n${itemLines.join("\n")}`;
  });

  return wrapExternalContext("FEED CONTENTS:", blocks.join("\n\n"));
}
