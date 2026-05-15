/**
 * OpenAI Provider Adapter
 *
 * Uses the OpenAI Chat Completions API (compatible with GPT-4o family).
 * Default model: gpt-4o
 * Budget option: configure OPENAI_MODEL=gpt-4o-mini
 *
 * Routed by: large tier — third in the large-model fallback chain after
 * Claude and Gemini, or as preferred when explicitly set.
 */

import type { AIProvider, OpenAIProviderConfig, EscalationResult, ConversationTurn } from "./interface";
import type { NodeCore, SyncSignal } from "../../types/core";
import { buildSystemPrompt, buildUserPrompt, parseProviderResponse } from "./interface";
import { ProviderError, withRetry, parseRetryAfter } from "./retry";

const DEFAULT_MODEL = "gpt-4o";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;
  readonly modelId: string;
  private readonly apiKey: string;

  constructor(config: OpenAIProviderConfig) {
    this.apiKey = config.apiKey;
    this.modelId = config.model ?? DEFAULT_MODEL;
  }

  isAvailable(): boolean {
    return this.apiKey.trim().length > 0;
  }

  async escalate(
    userInput: string,
    signal: SyncSignal,
    core: NodeCore,
    patterns: { hour: number; avg_arousal: number; sample_count: number }[],
    conversationHistory: ConversationTurn[] = [],
  ): Promise<EscalationResult> {
    const start = Date.now();
    const systemPrompt = buildSystemPrompt(core, patterns);
    const userPrompt = buildUserPrompt(userInput, signal);

    return withRetry(async () => {
      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelId,
          max_tokens: 600,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory.map((t) => ({ role: t.role, content: t.content })),
            { role: "user", content: userPrompt },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new ProviderError(response.status, "openai", parseRetryAfter(response.headers));
      }

      const data = await response.json() as {
        choices?: { message?: { content?: string } }[];
        error?: { message: string };
      };

      if (data.error) throw new ProviderError(500, "openai");

      const rawText = data.choices?.[0]?.message?.content ?? "";
      if (!rawText) throw new ProviderError(500, "openai");

      return parseProviderResponse(rawText, "openai", this.modelId, Date.now() - start);
    });
  }
}
