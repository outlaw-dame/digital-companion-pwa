/**
 * Client-Side Provider Interface
 *
 * Mirrors the server-side AIProvider contract but runs entirely in the browser.
 * No network call to the Bun server. No API keys. No external dependencies
 * beyond what is cached locally on the device.
 *
 * Two implementations:
 *   WebLLMProvider    — @mlc-ai/web-llm, WebGPU-accelerated, OpenAI-compatible API
 *   LiteRTProvider    — @mediapipe/tasks-genai, Google's LiteRT-LM stack for Web
 *
 * Both run in a Web Worker to keep the UI thread free during inference.
 *
 * Lifecycle that differs from server providers:
 *   1. CAPABILITY CHECK — does the browser support WebGPU / WASM?
 *   2. MODEL DOWNLOAD   — first-use model download to Cache API (can be GBs)
 *   3. WARM-UP          — model loaded into GPU memory, ready for inference
 *   4. INFERENCE        — streaming token generation, no network
 *
 * The download phase is surfaced to the UI with progress events.
 * Subsequent uses skip download (Cache API hit).
 */

import type { AffectState, EQDomain, ArousalValence } from '../../types/core';

// ── Provider Names ──────────────────────────────────────────────────────────

export type ClientProviderName = 'webllm' | 'litert';

// ── Download State ──────────────────────────────────────────────────────────

export type DownloadStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'loading'
  | 'ready'
  | 'error';

export interface DownloadProgress {
  status: DownloadStatus;
  progress: number;   // 0.0 → 1.0
  message: string;
  error?: string;
}

// ── Inference Result ────────────────────────────────────────────────────────

export interface ClientEscalationResult {
  entityResponse: string;
  refinedAffect?: AffectState;
  refinedArousal?: number;
  refinedValence?: ArousalValence;
  refinedEQDomain?: EQDomain;
  shouldCreateAnchor: boolean;
  providerUsed: ClientProviderName;
  modelUsed: string;
  latencyMs: number;
}

// ── Model Options ───────────────────────────────────────────────────────────

export interface ClientModelOption {
  id: string;
  label: string;
  description: string;
  sizeGb: number;
  speed: 'fast' | 'medium' | 'slow';
  requires: 'webgpu' | 'wasm';
  provider: ClientProviderName;
}

// ── Provider Interface ──────────────────────────────────────────────────────

export interface ClientAIProvider {
  readonly name: ClientProviderName;
  readonly modelId: string;

  /** Check if the browser supports this provider (WebGPU, WASM, etc.) */
  isSupported(): Promise<boolean>;

  /** Check if model is already cached and ready */
  isModelCached(): Promise<boolean>;

  /** Download and initialize the model. Calls onProgress during download. */
  initialize(onProgress: (p: DownloadProgress) => void): Promise<void>;

  /** Run inference. Model must be initialized first. */
  generate(systemPrompt: string, userPrompt: string): Promise<ClientEscalationResult>;

  /** Stream inference token by token. */
  generateStream(
    systemPrompt: string,
    userPrompt: string,
    onToken: (token: string, done: boolean) => void,
  ): Promise<ClientEscalationResult>;

  /** Release GPU/WASM memory */
  dispose(): void;
}

// ── Shared Prompt Helpers ───────────────────────────────────────────────────
// Client providers get the same system prompt as server providers.
// Imported from the response parsing logic here rather than duplicating.

export function parseClientResponse(
  raw: string,
  provider: ClientProviderName,
  modelId: string,
  latencyMs: number,
): ClientEscalationResult {
  try {
    const clean = raw.replace(/```json\n?|```\n?/g, '').trim();
    // Find the first { ... } block in case the model adds preamble
    const jsonStart = clean.indexOf('{');
    const jsonEnd = clean.lastIndexOf('}');
    const jsonStr = jsonStart >= 0 && jsonEnd > jsonStart
      ? clean.slice(jsonStart, jsonEnd + 1)
      : clean;

    const parsed = JSON.parse(jsonStr);

    return {
      entityResponse: parsed.entityResponse ?? 'Processing…',
      refinedAffect: parsed.refinedAffect,
      refinedArousal: parsed.refinedArousal,
      refinedValence: parsed.refinedValence,
      refinedEQDomain: parsed.refinedEQDomain,
      shouldCreateAnchor: parsed.shouldCreateAnchor === true,
      providerUsed: provider,
      modelUsed: modelId,
      latencyMs,
    };
  } catch {
    // Model returned non-JSON — treat the whole thing as the response
    return {
      entityResponse: raw.replace(/```json|```/g, '').trim().slice(0, 300),
      shouldCreateAnchor: false,
      providerUsed: provider,
      modelUsed: modelId,
      latencyMs,
    };
  }
}

// ── WebGPU Detection ────────────────────────────────────────────────────────

export async function detectWebGPU(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  if (!('gpu' in navigator)) return false;
  try {
    const adapter = await (navigator as unknown as { gpu: { requestAdapter(): Promise<unknown> } })
      .gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

// ── WASM Detection ──────────────────────────────────────────────────────────

export function detectWASM(): boolean {
  try {
    if (typeof WebAssembly === 'object' &&
        typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(
        Uint8Array.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
      );
      return module instanceof WebAssembly.Module;
    }
    return false;
  } catch {
    return false;
  }
}
