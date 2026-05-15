/**
 * Ollama Provider Adapter
 *
 * Calls a locally-running Ollama instance.
 * Default endpoint: http://localhost:11434
 *
 * This is the fully air-gapped option — zero data leaves the device.
 * Requires the user to have Ollama installed and a model pulled.
 *
 * Recommended models (pull with `ollama pull <model>`):
 *   - llama3.2          (3B, fast, good default)
 *   - llama3.1:8b       (8B, better quality)
 *   - mistral           (7B, lean and reliable)
 *   - qwen2.5:7b        (strong reasoning)
 *   - phi3.5            (3.8B, Microsoft, excellent for small hardware)
 *
 * Uses the Ollama /api/chat endpoint which follows the same
 * messages format, making the prompt layer identical to other providers.
 */

import type { AIProvider, OllamaProviderConfig, EscalationResult, ChatMessage } from "./interface";
import type { NodeCore, SyncSignal } from "../../types/core";
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseProviderResponse,
} from "./interface";

const DEFAULT_OLLAMA_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.2";

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export class OllamaProvider implements AIProvider {
  readonly name = "ollama" as const;
  readonly modelId: string;
  private readonly baseUrl: string;
  private _available: boolean | null = null;

  constructor(config: OllamaProviderConfig) {
    this.baseUrl = config.baseUrl ?? DEFAULT_OLLAMA_URL;
    this.modelId = config.model ?? DEFAULT_OLLAMA_MODEL;
  }

  isAvailable(): boolean {
    // We can't synchronously check if Ollama is running.
    // Return true and let the escalate() method handle the error.
    // The pipeline will catch and fall through to the next provider.
    return true;
  }

  async escalate(
    userInput: string,
    signal: SyncSignal,
    core: NodeCore,
    patterns: { hour: number; avg_arousal: number; sample_count: number }[],
  ): Promise<EscalationResult> {
    const start = Date.now();
    const systemPrompt = buildSystemPrompt(core, patterns);
    const userPrompt = buildUserPrompt(userInput, signal);

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        stream: false,
        format: "json", // Ollama JSON mode
        options: {
          num_predict: 600,
          temperature: 0.7,
        },
      }),
      signal: AbortSignal.timeout(30_000), // 30s timeout for local inference
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama ${response.status}: ${err}`);
    }

    const data = await response.json() as OllamaChatResponse;
    const rawText = data.message?.content ?? "";

    if (!rawText) {
      throw new Error("Ollama returned an empty response");
    }

    return parseProviderResponse(rawText, "ollama", this.modelId, Date.now() - start);
  }
}
