/**
 * WebLLM Provider
 *
 * In-browser LLM inference via @mlc-ai/web-llm.
 * Uses WebGPU for hardware acceleration. Fully OpenAI API compatible.
 * Zero network calls during inference — model cached in Cache API.
 *
 * Package: @mlc-ai/web-llm (MIT)
 * Requires: WebGPU-capable browser (Chrome 113+, Edge 113+)
 *
 * Models cached via Cache API — survives page reloads, cleared by user.
 * First download: 1.5 GB – 4 GB depending on model.
 * Subsequent loads: instant (cache hit).
 *
 * The engine runs in a Web Worker via WebLLM's built-in ServiceWorkerMLCEngine
 * or the standard MLCEngine, keeping the UI thread free during token generation.
 *
 * Recommended models for ANE:
 *   Llama-3.2-3B-Instruct-q4f32_1-MLC  — 1.8GB, fast, good quality
 *   Llama-3.2-1B-Instruct-q4f32_1-MLC  — 0.8GB, fastest, lighter quality
 *   Phi-3.5-mini-instruct-q4f16_1-MLC  — 2.1GB, excellent reasoning
 *   gemma-2-2b-it-q4f32_1-MLC          — 1.5GB, Google, strong quality
 */

import type {
  ClientAIProvider,
  ClientEscalationResult,
  DownloadProgress,
  ClientModelOption,
} from './clientInterface';
import { detectWebGPU, parseClientResponse } from './clientInterface';

// ── Model Catalog ───────────────────────────────────────────────────────────

export const WEBLLM_MODELS: ClientModelOption[] = [
  {
    id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC',
    label: 'Llama 3.2 3B',
    description: 'Fast, good quality. Best default for most devices.',
    sizeGb: 1.8,
    speed: 'fast',
    requires: 'webgpu',
    provider: 'webllm',
  },
  {
    id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    label: 'Llama 3.2 1B',
    description: 'Fastest, smallest. For low-memory devices.',
    sizeGb: 0.8,
    speed: 'fast',
    requires: 'webgpu',
    provider: 'webllm',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    label: 'Phi-3.5 Mini',
    description: 'Microsoft. Excellent reasoning for its size.',
    sizeGb: 2.1,
    speed: 'medium',
    requires: 'webgpu',
    provider: 'webllm',
  },
  {
    id: 'gemma-2-2b-it-q4f32_1-MLC',
    label: 'Gemma 2 2B',
    description: 'Google open model. Strong instruction following.',
    sizeGb: 1.5,
    speed: 'medium',
    requires: 'webgpu',
    provider: 'webllm',
  },
  {
    id: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC',
    label: 'Mistral 7B',
    description: 'Larger model. Higher quality, slower on mobile.',
    sizeGb: 4.1,
    speed: 'slow',
    requires: 'webgpu',
    provider: 'webllm',
  },
];

export const DEFAULT_WEBLLM_MODEL = WEBLLM_MODELS[0].id;

// ── Provider ────────────────────────────────────────────────────────────────

export class WebLLMProvider implements ClientAIProvider {
  readonly name = 'webllm' as const;
  readonly modelId: string;

  // Engine is dynamically imported to avoid bundling WebLLM unless used
  private engine: unknown = null;
  private initialized = false;

  constructor(modelId?: string) {
    this.modelId = modelId ?? DEFAULT_WEBLLM_MODEL;
  }

  async isSupported(): Promise<boolean> {
    return detectWebGPU();
  }

  async isModelCached(): Promise<boolean> {
    // WebLLM caches models in Cache API under a predictable key
    try {
      const caches = window.caches;
      const keys = await caches.keys();
      // WebLLM uses cache keys containing the model id
      return keys.some((k) => k.includes(this.modelId));
    } catch {
      return false;
    }
  }

  async initialize(onProgress: (p: DownloadProgress) => void): Promise<void> {
    if (this.initialized) return;

    onProgress({ status: 'checking', progress: 0, message: 'Checking WebGPU support…' });

    const supported = await this.isSupported();
    if (!supported) {
      throw new Error('WebGPU is not supported in this browser. Use Chrome 113+ or Edge 113+.');
    }

    onProgress({ status: 'loading', progress: 0, message: 'Loading WebLLM engine…' });

    // Dynamic import — WebLLM is a large package, only loaded when this provider is selected
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

    onProgress({ status: 'downloading', progress: 0, message: `Initializing ${this.modelId}…` });

    this.engine = await CreateMLCEngine(this.modelId, {
      initProgressCallback: (report: { progress: number; text: string }) => {
        onProgress({
          status: report.progress < 1 ? 'downloading' : 'loading',
          progress: report.progress,
          message: report.text ?? `${Math.round(report.progress * 100)}% downloaded`,
        });
      },
    });

    this.initialized = true;
    onProgress({ status: 'ready', progress: 1, message: 'Model ready' });
  }

  async generate(systemPrompt: string, userPrompt: string): Promise<ClientEscalationResult> {
    if (!this.initialized || !this.engine) {
      throw new Error('WebLLM engine not initialized. Call initialize() first.');
    }

    const start = Date.now();

    const engine = this.engine as {
      chat: {
        completions: {
          create(params: {
            messages: { role: string; content: string }[];
            max_tokens: number;
            response_format?: { type: string };
            temperature?: number;
          }): Promise<{ choices: { message: { content: string } }[] }>;
        };
      };
    };

    const response = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 600,
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const rawText = response.choices[0]?.message?.content ?? '';
    return parseClientResponse(rawText, 'webllm', this.modelId, Date.now() - start);
  }

  async generateStream(
    systemPrompt: string,
    userPrompt: string,
    onToken: (token: string, done: boolean) => void,
  ): Promise<ClientEscalationResult> {
    if (!this.initialized || !this.engine) {
      throw new Error('WebLLM engine not initialized.');
    }

    const start = Date.now();

    const engine = this.engine as {
      chat: {
        completions: {
          create(params: {
            messages: { role: string; content: string }[];
            max_tokens: number;
            stream: boolean;
            temperature?: number;
          }): Promise<AsyncIterable<{
            choices: { delta: { content?: string } }[];
          }>>;
        };
      };
    };

    // Note: streaming + json_object don't mix well — stream the response
    // as plain text and parse at the end
    const chunks = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 600,
      stream: true,
      temperature: 0.7,
    });

    let fullText = '';
    for await (const chunk of chunks) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        fullText += delta;
        onToken(delta, false);
      }
    }

    onToken('', true);
    return parseClientResponse(fullText, 'webllm', this.modelId, Date.now() - start);
  }

  dispose(): void {
    // WebLLM engines don't have an explicit dispose — nulling the reference
    // allows GC to reclaim. For explicit GPU memory release, the engine
    // would need to be rebuilt (WebLLM doesn't currently expose unload()).
    this.engine = null;
    this.initialized = false;
  }
}
