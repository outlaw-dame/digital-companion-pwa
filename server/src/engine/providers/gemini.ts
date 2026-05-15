/**
 * Gemini Provider Adapter
 *
 * Uses Google's Generative Language REST API.
 * Default model: gemini-2.0-flash (fast, cost-effective)
 * High-quality option: gemini-2.5-pro (configure via GEMINI_MODEL env)
 *
 * Routed by: large tier — complex emotional queries, long-context synthesis,
 * multimodal tasks (future), and as Claude fallback.
 */

import type { AIProvider, GeminiProviderConfig, EscalationResult, ConversationTurn } from "./interface";
import type { NodeCore, SyncSignal } from "../../types/core";
import { buildSystemPrompt, buildUserPrompt, parseProviderResponse } from "./interface";
import { ProviderError, withRetry, parseRetryAfter } from "./retry";

const DEFAULT_MODEL = "gemini-2.0-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Gemini uses 'model' for assistant turns; requires turn to start with 'user'.
function toGeminiContents(history: ConversationTurn[]): { role: string; parts: { text: string }[] }[] {
  const contents = history.map((t) => ({
    role: t.role === "assistant" ? "model" : "user",
    parts: [{ text: t.content }],
  }));
  if (contents.length > 0 && contents[0].role === "model") contents.shift();
  return contents;
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;
  readonly modelId: string;
  private readonly apiKey: string;

  constructor(config: GeminiProviderConfig) {
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
    const historyContents = toGeminiContents(conversationHistory);
    const url = `${GEMINI_API_BASE}/${this.modelId}:generateContent`;

    return withRetry(async () => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [
            ...historyContents,
            { role: "user", parts: [{ text: userPrompt }] },
          ],
          generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        throw new ProviderError(response.status, "gemini", parseRetryAfter(response.headers));
      }

      const data = await response.json() as {
        candidates?: {
          content?: { parts?: { text?: string }[] };
          finishReason?: string;
        }[];
        error?: { message: string };
      };

      if (data.error) throw new ProviderError(500, "gemini");

      const parts = data.candidates?.[0]?.content?.parts;
      const rawText = Array.isArray(parts)
        ? parts.map((p) => p.text ?? "").join("")
        : "";

      if (!rawText) throw new ProviderError(500, "gemini");

      return parseProviderResponse(rawText, "gemini", this.modelId, Date.now() - start);
    });
  }
}
