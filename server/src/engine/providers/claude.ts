/**
 * Claude Provider Adapter
 *
 * Uses the Anthropic Messages API directly.
 * Model: claude-sonnet-4-20250514 (hardcoded default, overridable via config)
 *
 * This is the highest-fidelity provider for complex emotional analysis
 * and nuanced character-consistent responses. Use as the first choice
 * when an Anthropic API key is available.
 */

import type { AIProvider, ClaudeProviderConfig, EscalationResult } from "./interface";
import type { NodeCore, SyncSignal } from "../../types/core";
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseProviderResponse,
} from "./interface";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

export class ClaudeProvider implements AIProvider {
  readonly name = "claude" as const;
  readonly modelId: string;
  private readonly apiKey: string;

  constructor(config: ClaudeProviderConfig) {
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
  ): Promise<EscalationResult> {
    const start = Date.now();
    const systemPrompt = buildSystemPrompt(core, patterns);
    const userPrompt = buildUserPrompt(userInput, signal);

    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify({
        model: this.modelId,
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API ${response.status}: ${err}`);
    }

    const data = await response.json() as {
      content: { type: string; text: string }[];
    };

    const rawText = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    return parseProviderResponse(rawText, "claude", this.modelId, Date.now() - start);
  }
}
