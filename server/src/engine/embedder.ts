/**
 * Embedding Generation — Privacy-First, Resilient
 *
 * Provider priority (most private first):
 *   1. Ollama  — local; data never leaves the device
 *   2. OpenAI  — text-embedding-3-small, 512 dims via matryoshka
 *   3. Cloudflare Workers AI — bge-base-en-v1.5, 768 dims
 *
 * Set EMBED_PROVIDER=ollama|openai|cloudflare to force a specific provider.
 * Set OLLAMA_EMBED_MODEL to override the Ollama model (default: nomic-embed-text).
 *
 * Vectors are stored only in SQLite and are NEVER logged or transmitted beyond
 * the embedding API call. Text is sanitized before sending to any API.
 *
 * Circuit breaker: after 3 consecutive failures the provider is silenced for
 * 60 s to prevent thundering-herd retries; it self-heals after the cooldown.
 */

import { ProviderError, withRetry } from "./providers/retry";
import { sanitizeExternalText } from "../utils/promptSanitizer";

// ─── Provider spec ────────────────────────────────────────────────────────────

export interface EmbedderSpec {
  readonly provider: "ollama" | "openai" | "cloudflare";
  readonly model: string;
  readonly dim: number;
  readonly baseUrl?: string;   // Ollama only
  readonly apiKey?: string;    // OpenAI / Cloudflare
  readonly accountId?: string; // Cloudflare only
}

/** Stable string that uniquely identifies a model's embedding space. */
export function fingerprintOf(spec: EmbedderSpec): string {
  return `${spec.provider}:${spec.model}:${spec.dim}`;
}

// ─── Config resolution ────────────────────────────────────────────────────────
// Resolved once on first call; cached for the process lifetime.

let _spec: EmbedderSpec | null | undefined = undefined;

export function getEmbedderSpec(): EmbedderSpec | null {
  if (_spec !== undefined) return _spec;

  const forced = (process.env.EMBED_PROVIDER ?? "").toLowerCase().trim();

  // 1. Ollama (local — privacy-first default when no explicit override)
  if (!forced || forced === "ollama") {
    const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/$/, "");
    const model   = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";
    return (_spec = { provider: "ollama", model, dim: 768, baseUrl });
  }

  // 2. OpenAI (512-dim via matryoshka dimension reduction)
  if (forced === "openai" || process.env.OPENAI_API_KEY) {
    const apiKey = process.env.OPENAI_API_KEY ?? "";
    if (apiKey) {
      return (_spec = { provider: "openai", model: "text-embedding-3-small", dim: 512, apiKey });
    }
  }

  // 3. Cloudflare Workers AI
  if (
    forced === "cloudflare" ||
    (process.env.CLOUDFLARE_AI_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID)
  ) {
    const apiKey    = process.env.CLOUDFLARE_AI_TOKEN   ?? "";
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
    if (apiKey && accountId) {
      return (_spec = {
        provider: "cloudflare",
        model: "@cf/baai/bge-base-en-v1.5",
        dim: 768,
        apiKey,
        accountId,
      });
    }
  }

  return (_spec = null);
}

export function isEmbeddingAvailable(): boolean {
  return getEmbedderSpec() !== null;
}

export function getModelFingerprint(): string | null {
  const spec = getEmbedderSpec();
  return spec ? fingerprintOf(spec) : null;
}

// ─── Circuit breaker ──────────────────────────────────────────────────────────
// After BREAK_THRESHOLD consecutive failures the provider is silenced for
// BREAK_DURATION_MS, then retried. Prevents hammering a down API or Ollama
// instance on every request.

const BREAK_THRESHOLD   = 3;
const BREAK_DURATION_MS = 60_000;

let _consecutiveFailures = 0;
let _circuitOpenUntil    = 0;

function isCircuitOpen(): boolean {
  return Date.now() < _circuitOpenUntil;
}

function onSuccess(): void {
  _consecutiveFailures = 0;
}

function onFailure(): void {
  if (++_consecutiveFailures >= BREAK_THRESHOLD) {
    _circuitOpenUntil = Date.now() + BREAK_DURATION_MS;
  }
}

/** Test-only: reset all module-level state between runs. */
export function __resetEmbedder(): void {
  _consecutiveFailures = 0;
  _circuitOpenUntil    = 0;
  _spec                = undefined;
}

// ─── Provider implementations ─────────────────────────────────────────────────

async function callOllama(text: string, spec: EmbedderSpec): Promise<Float32Array> {
  const res = await fetch(`${spec.baseUrl}/api/embeddings`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ model: spec.model, prompt: text }),
    signal:  AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new ProviderError(res.status, "ollama-embed");
  const data = await res.json() as { embedding?: number[] };
  if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
    throw new Error("Ollama embedding response: missing or empty embedding array");
  }
  return new Float32Array(data.embedding);
}

async function callOpenAI(text: string, spec: EmbedderSpec): Promise<Float32Array> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${spec.apiKey}`,
    },
    body:   JSON.stringify({ model: spec.model, input: text, dimensions: spec.dim }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new ProviderError(res.status, "openai-embed");
  const data = await res.json() as { data?: { embedding: number[] }[] };
  const vec = data.data?.[0]?.embedding;
  if (!vec || vec.length === 0) throw new Error("OpenAI embedding response: missing data[0].embedding");
  return new Float32Array(vec);
}

async function callCloudflare(text: string, spec: EmbedderSpec): Promise<Float32Array> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${spec.accountId}/ai/run/${spec.model}`;
  const res = await fetch(url, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${spec.apiKey}`,
    },
    body:   JSON.stringify({ text }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new ProviderError(res.status, "cloudflare-embed");
  const data = await res.json() as { result?: { data?: number[][] } };
  const vec = data.result?.data?.[0];
  if (!vec || vec.length === 0) throw new Error("Cloudflare embedding response: missing result.data[0]");
  return new Float32Array(vec);
}

// ─── Public embedding function ────────────────────────────────────────────────

const MAX_EMBED_CHARS = 2_000;

/**
 * Generate an embedding vector for the given text.
 *
 * Returns null — without throwing — when:
 *   - No provider is configured
 *   - The circuit breaker is open (too many recent failures)
 *   - All retries are exhausted
 *
 * Null is non-fatal: the observation remains searchable via FTS5 alone.
 */
export async function embedText(text: string): Promise<Float32Array | null> {
  const spec = getEmbedderSpec();
  if (!spec || isCircuitOpen()) return null;

  const clean = sanitizeExternalText(text, MAX_EMBED_CHARS);
  if (!clean) return null;

  try {
    const vec = await withRetry(async () => {
      switch (spec.provider) {
        case "ollama":     return callOllama(clean, spec);
        case "openai":     return callOpenAI(clean, spec);
        case "cloudflare": return callCloudflare(clean, spec);
      }
    }, 4, 1_000);

    onSuccess();
    return vec;
  } catch (err) {
    onFailure();
    const cooldownSec = Math.max(0, Math.ceil((_circuitOpenUntil - Date.now()) / 1_000));
    const suffix = cooldownSec > 0 ? ` (circuit open for ${cooldownSec}s)` : "";
    console.warn(`[embedder] ${(err as Error).message}${suffix}`);
    return null;
  }
}

// ─── Serialization helpers ────────────────────────────────────────────────────
// Float32Array ↔ Buffer for SQLite BLOB storage.
// Uses native memory layout (little-endian IEEE 754) — no copy on modern engines.

export function float32ToBuffer(arr: Float32Array): Buffer {
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
}

export function bufferToFloat32(buf: Buffer | Uint8Array): Float32Array {
  // SQLite returns Uint8Array for BLOB columns; coerce to Buffer first so
  // .buffer/.byteOffset are reliable across both types.
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
}
