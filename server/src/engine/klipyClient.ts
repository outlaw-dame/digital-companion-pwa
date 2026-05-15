/**
 * Klipy API client — GIF keyboard scope only.
 *
 * Base URL: https://api.klipy.com/api/v1/{API_KEY}
 * The API key is embedded in the URL path — it must never reach the client.
 * All calls go through the server proxy at /api/media/gifs/*.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KlipyFileVariant {
  url: string;
  width: number;
  height: number;
}

export interface KlipyGifFiles {
  gif?: KlipyFileVariant;
  webp?: KlipyFileVariant;
  mp4?: KlipyFileVariant;
  tinyGif?: KlipyFileVariant;
  tinyMp4?: KlipyFileVariant;
}

export interface KlipyGif {
  slug: string;
  title: string;
  files: KlipyGifFiles;
}

export interface KlipyCategory {
  slug: string;
  name: string;
  gif?: KlipyGif;
}

export interface KlipyPage<T> {
  result: boolean;
  data: {
    data: T[];
    current_page: number;
    per_page: number;
    has_next: boolean;
  };
}

export interface KlipyCategoryResponse {
  result: boolean;
  data: KlipyCategory[];
}

// ─── Client ───────────────────────────────────────────────────────────────────

const KLIPY_BASE = "https://api.klipy.com/api/v1";
const TIMEOUT_MS = 8_000;

type QueryParams = Record<string, string | number | undefined>;

class KlipyClient {
  private readonly root: string;

  constructor(apiKey: string) {
    this.root = `${KLIPY_BASE}/${encodeURIComponent(apiKey)}`;
  }

  private async get<T>(path: string, params: QueryParams = {}): Promise<T> {
    const url = new URL(`${this.root}${path}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
    const res = await fetch(url.href, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Klipy ${res.status} on ${path}`);
    return res.json() as Promise<T>;
  }

  trending(params: { page?: number; per_page?: number; rating?: string } = {}) {
    return this.get<KlipyPage<KlipyGif>>("/gifs/trending", params as QueryParams);
  }

  search(q: string, params: { page?: number; per_page?: number; rating?: string } = {}) {
    return this.get<KlipyPage<KlipyGif>>("/gifs/search", { q, ...params } as QueryParams);
  }

  categories() {
    return this.get<KlipyCategoryResponse>("/gifs/categories");
  }

  /** Fire-and-forget — Klipy requires a share trigger after the user selects a GIF. */
  share(slug: string): void {
    const url = `${this.root}/gifs/${encodeURIComponent(slug)}/share`;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(5_000),
    }).catch(() => {});
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: KlipyClient | null = null;

export function getKlipyClient(): KlipyClient | null {
  const key = process.env.KLIPY_API_KEY;
  if (!key) return null;
  if (!_instance) _instance = new KlipyClient(key);
  return _instance;
}

export function isKlipyAvailable(): boolean {
  return Boolean(process.env.KLIPY_API_KEY);
}
