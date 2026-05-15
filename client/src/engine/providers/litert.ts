/**
 * LiteRT Provider
 *
 * In-browser LLM inference via Google's MediaPipe LLM Inference API for Web.
 * Powered by LiteRT-LM under the hood. Uses WebGPU where available,
 * falls back to WASM/CPU.
 *
 * Package: @mediapipe/tasks-genai (Apache 2.0)
 * WASM files: served from jsdelivr CDN or self-hosted
 * Models: .litertlm format, downloaded from HuggingFace
 *
 * Key differences from WebLLM:
 *   - Google's stack — powers Chrome, Chromebook Plus, Pixel Watch
 *   - Gemma-native: best performance on Gemma model family
 *   - Multimodal: Gemma-3n models support image + audio input
 *   - Simpler streaming API (callback-based vs AsyncGenerator)
 *   - Model format: .litertlm (not MLC format)
 *   - Requires HuggingFace account + model access grant for some models
 *
 * Recommended models:
 *   gemma-3n-E2B-it-int4-Web.litertlm  — 3.1GB, fast, multimodal
 *   gemma-3n-E4B-it-int4-Web.litertlm  — 5.2GB, higher quality
 *   gemma-2-2b-it-gpu-int8.bin          — 1.8GB, GPU optimized
 *
 * Model files must be downloaded separately from HuggingFace and
 * placed in public/models/ or served from a CDN you control.
 * Direct HuggingFace URLs require the user to be logged in with access.
 *
 * WASM files are loaded from CDN by default; self-host for offline PWA.
 */

import type {
  ClientAIProvider,
  ClientEscalationResult,
  DownloadProgress,
  ClientModelOption,
} from './clientInterface';
import { detectWebGPU, detectWASM, parseClientResponse } from './clientInterface';

// ── Model Catalog ───────────────────────────────────────────────────────────

export const LITERT_MODELS: ClientModelOption[] = [
  {
    id: 'gemma-3n-E2B-it-int4-Web.litertlm',
    label: 'Gemma 3n E2B (Multimodal)',
    description: "Google's Gemma 3n. Fast, multimodal (text + image). Recommended.",
    sizeGb: 3.1,
    speed: 'fast',
    requires: 'webgpu',
    provider: 'litert',
  },
  {
    id: 'gemma-3n-E4B-it-int4-Web.litertlm',
    label: 'Gemma 3n E4B (Multimodal)',
    description: 'Larger Gemma 3n. Better quality, needs more VRAM.',
    sizeGb: 5.2,
    speed: 'medium',
    requires: 'webgpu',
    provider: 'litert',
  },
  {
    id: 'gemma-2-2b-it-gpu-int8.bin',
    label: 'Gemma 2 2B (GPU)',
    description: 'Smaller Gemma 2. Good fallback if Gemma 3n is too large.',
    sizeGb: 1.8,
    speed: 'fast',
    requires: 'webgpu',
    provider: 'litert',
  },
];

export const DEFAULT_LITERT_MODEL = LITERT_MODELS[0].id;

// ── WASM endpoint ───────────────────────────────────────────────────────────
// In production, self-host these for offline PWA capability.
// Copy wasm/ from node_modules/@mediapipe/tasks-genai/wasm to public/wasm/litert/
const LITERT_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-genai@latest/wasm';

export interface LiteRTConfig {
  modelUrl: string;          // URL or path to .litertlm file
  modelId?: string;          // Override model ID for display; defaults to DEFAULT_LITERT_MODEL
  wasmUrl?: string;          // Path to WASM files (default: CDN)
  maxTokens?: number;
  topK?: number;
  temperature?: number;
}

// ── Type shims for MediaPipe (avoid bundling types before dynamic import) ───

interface LlmInferenceModule {
  FilesetResolver: {
    forGenAiTasks(wasmPath: string): Promise<unknown>;
  };
  LlmInference: {
    createFromOptions(
      genai: unknown,
      options: {
        baseOptions: { modelAssetPath: string };
        maxTokens: number;
        topK: number;
        temperature: number;
        randomSeed: number;
      }
    ): Promise<{
      generateResponse(
        prompt: string,
        callback?: (partial: string, done: boolean) => void
      ): Promise<string>;
      close(): void;
    }>;
  };
}

// ── Provider ────────────────────────────────────────────────────────────────

export class LiteRTProvider implements ClientAIProvider {
  readonly name = 'litert' as const;
  readonly modelId: string;
  private readonly config: LiteRTConfig;
  private inference: Awaited<ReturnType<LlmInferenceModule['LlmInference']['createFromOptions']>> | null = null;
  private initialized = false;

  constructor(config: LiteRTConfig) {
    this.modelId = config.modelId ?? DEFAULT_LITERT_MODEL;
    this.config = config;
  }

  async isSupported(): Promise<boolean> {
    // LiteRT Web supports WebGPU (preferred) or WASM CPU fallback
    const hasWebGPU = await detectWebGPU();
    const hasWASM = detectWASM();
    return hasWebGPU || hasWASM;
  }

  async isModelCached(): Promise<boolean> {
    // LiteRT models are loaded via fetch — check if the URL is in Cache API
    try {
      const cache = await caches.open('litert-models');
      const response = await cache.match(this.config.modelUrl);
      return response !== undefined;
    } catch {
      return false;
    }
  }

  async initialize(onProgress: (p: DownloadProgress) => void): Promise<void> {
    if (this.initialized) return;

    onProgress({ status: 'checking', progress: 0, message: 'Checking browser support…' });

    const supported = await this.isSupported();
    if (!supported) {
      throw new Error('This browser does not support WebGPU or WebAssembly. Cannot run LiteRT.');
    }

    onProgress({ status: 'loading', progress: 0, message: 'Loading LiteRT WASM modules…' });

    // Dynamic import — only loaded when provider is selected
    const mediapipe = await import('@mediapipe/tasks-genai') as LlmInferenceModule;
    const { FilesetResolver, LlmInference } = mediapipe;

    const wasmPath = this.config.wasmUrl ?? LITERT_WASM_CDN;
    const genai = await FilesetResolver.forGenAiTasks(wasmPath);

    onProgress({
      status: 'downloading',
      progress: 0,
      message: `Downloading ${this.modelId} (this may take a few minutes)…`,
    });

    // MediaPipe doesn't expose fine-grained download progress natively.
    // We simulate progress during the model load phase.
    const progressInterval = simulateDownloadProgress(onProgress);

    try {
      this.inference = await LlmInference.createFromOptions(genai, {
        baseOptions: { modelAssetPath: this.config.modelUrl },
        maxTokens: this.config.maxTokens ?? 600,
        topK: this.config.topK ?? 40,
        temperature: this.config.temperature ?? 0.8,
        randomSeed: 101,
      });
    } finally {
      clearInterval(progressInterval);
    }

    this.initialized = true;
    onProgress({ status: 'ready', progress: 1, message: 'LiteRT model ready' });
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<ClientEscalationResult> {
    if (!this.initialized || !this.inference) {
      throw new Error('LiteRT model not initialized. Call initialize() first.');
    }

    const start = Date.now();
    // LiteRT uses a single prompt string — combine system + user
    const combinedPrompt = formatLiteRTPrompt(systemPrompt, userPrompt);
    const rawText = await this.inference.generateResponse(combinedPrompt);
    return parseClientResponse(rawText, 'litert', this.modelId, Date.now() - start);
  }

  async generateStream(
    systemPrompt: string,
    userPrompt: string,
    onToken: (token: string, done: boolean) => void,
  ): Promise<ClientEscalationResult> {
    if (!this.initialized || !this.inference) {
      throw new Error('LiteRT model not initialized.');
    }

    const start = Date.now();
    const combinedPrompt = formatLiteRTPrompt(systemPrompt, userPrompt);
    let fullText = '';

    await this.inference.generateResponse(combinedPrompt, (partial, done) => {
      fullText += partial;
      onToken(partial, done);
    });

    return parseClientResponse(fullText, 'litert', this.modelId, Date.now() - start);
  }

  dispose(): void {
    this.inference?.close();
    this.inference = null;
    this.initialized = false;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// LiteRT expects a flat prompt string. Format system + user turns appropriately.
function formatLiteRTPrompt(system: string, user: string): string {
  // Gemma instruction format: <start_of_turn>user\n...<end_of_turn>\n<start_of_turn>model\n
  // The system prompt is prepended to the user turn for models that don't support system role
  return `<start_of_turn>user\n${system}\n\n${user}<end_of_turn>\n<start_of_turn>model\n`;
}

// Simulates incremental progress during model load (MediaPipe doesn't expose it)
function simulateDownloadProgress(onProgress: (p: DownloadProgress) => void): ReturnType<typeof setInterval> {
  let simulated = 0;
  return setInterval(() => {
    // Slow asymptotic approach to 0.9 — never reaches 1.0 until actually done
    simulated = Math.min(0.9, simulated + (0.9 - simulated) * 0.05);
    onProgress({
      status: 'downloading',
      progress: simulated,
      message: `Loading model… ${Math.round(simulated * 100)}%`,
    });
  }, 400);
}

