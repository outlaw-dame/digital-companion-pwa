/**
 * Cloudflare Workers AI Provider Adapter
 *
 * Calls the Cloudflare Workers AI REST API:
 *   POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{model}
 *
 * Uses the chat/completions message format where the model supports it,
 * falling back to the prompt format for older models.
 *
 * Recommended models (all open-source, run on Cloudflare edge):
 *   - @cf/meta/llama-3.3-70b-instruct-fp8-fast  (best quality, fast)
 *   - @cf/meta/llama-3.1-8b-instruct             (faster, lighter)
 *   - @cf/meta/llama-4-scout-17b-16e-instruct    (multimodal, MoE)
 *   - @cf/mistral/mistral-7b-instruct-v0.1       (lean, reliable)
 *   - @cf/qwen/qwen3-14b                         (strong reasoning)
 *
 * Key properties:
 *   - No per-token cost on free tier (limited neurons/day)
 *   - All models are open-weight — no proprietary lock-in
 *   - Runs on Cloudflare's edge, globally distributed
 *   - Data is NOT used for training (per Cloudflare policy)
 *   - Account ID + API token required (free Cloudflare account sufficient)
 */

import type {
  AIProvider,
  CloudflareProviderConfig,
  EscalationResult,
  ChatMessage,
} from "./interface";
import type { NodeCore, SyncSignal } from "../../types/core";
import {
  buildSystemPrompt,
  buildUserPrompt,
  parseProviderResponse,
} from "./interface";

// ─── Available Models ─────────────────────────────────────────────────────────
// Curated list of recommended text-generation models.
// Users can select from these in the settings UI.

export interface CFModelOption {
  id: string;
  label: string;
  description: string;
  contextWindow: number;
  speed: "fast" | "medium" | "slow";
  tier: "free" | "paid";
}

export const CLOUDFLARE_MODELS: CFModelOption[] = [
  {
    id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    label: "Llama 3.3 70B (Fast)",
    description: "Meta's flagship open model, FP8 quantized for speed. Best overall quality on CF.",
    contextWindow: 128_000,
    speed: "fast",
    tier: "free",
  },
  {
    id: "@cf/meta/llama-3.1-8b-instruct",
    label: "Llama 3.1 8B",
    description: "Lightweight, fast inference. Good for most interactions.",
    contextWindow: 128_000,
    speed: "fast",
    tier: "free",
  },
  {
    id: "@cf/meta/llama-4-scout-17b-16e-instruct",
    label: "Llama 4 Scout 17B",
    description: "Natively multimodal MoE model. Excellent instruction following.",
    contextWindow: 128_000,
    speed: "medium",
    tier: "free",
  },
  {
    id: "@cf/mistral/mistral-7b-instruct-v0.1",
    label: "Mistral 7B",
    description: "Lean and reliable. Strong for focused, precise tasks.",
    contextWindow: 32_768,
    speed: "fast",
    tier: "free",
  },
  {
    id: "@cf/qwen/qwen3-14b",
    label: "Qwen3 14B",
    description: "Strong reasoning and instruction following across languages.",
    contextWindow: 32_768,
    speed: "medium",
    tier: "free",
  },
  {
    id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    label: "DeepSeek R1 32B (Distilled)",
    description: "Chain-of-thought reasoning model. Best for analytical tasks.",
    contextWindow: 32_768,
    speed: "slow",
    tier: "free",
  },
];

export const DEFAULT_CF_MODEL = CLOUDFLARE_MODELS[0].id;

// ─── Response Types ───────────────────────────────────────────────────────────

interface CFChatCompletionsResponse {
  result: {
    response?: string;  // Some models use this field
    choices?: { message: { content: string } }[];  // OpenAI-compat format
  };
  success: boolean;
  errors: { message: string }[];
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class CloudflareProvider implements AIProvider {
  readonly name = "cloudflare" as const;
  readonly modelId: string;
  private readonly apiToken: string;
  private readonly accountId: string;
  private readonly baseUrl: string;

  constructor(config: CloudflareProviderConfig) {
    this.apiToken = config.apiToken;
    this.accountId = config.accountId;
    this.modelId = config.model ?? DEFAULT_CF_MODEL;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run`;
  }

  isAvailable(): boolean {
    return (
      this.apiToken.trim().length > 0 &&
      this.accountId.trim().length > 0
    );
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

    // Cloudflare Workers AI supports the messages format for modern models
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const url = `${this.baseUrl}/${encodeURIComponent(this.modelId)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        max_tokens: 600,
        // Request JSON mode where supported
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Cloudflare Workers AI ${response.status}: ${err}`);
    }

    const data = await response.json() as CFChatCompletionsResponse;

    if (!data.success) {
      const errorMsg = data.errors.map((e) => e.message).join(", ");
      throw new Error(`Cloudflare Workers AI error: ${errorMsg}`);
    }

    // Normalize response — CF models return either result.response or result.choices
    const rawText =
      data.result.response ??
      data.result.choices?.[0]?.message?.content ??
      "";

    if (!rawText) {
      throw new Error("Cloudflare Workers AI returned an empty response");
    }

    return parseProviderResponse(rawText, "cloudflare", this.modelId, Date.now() - start);
  }
}
