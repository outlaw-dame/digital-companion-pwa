/**
 * AI Provider Interface
 *
 * Every backend the ANE entity can escalate to must implement this contract.
 * The architecture is a **strategy pattern**: the pipeline selects a provider
 * at runtime based on user config, then calls it through this interface.
 *
 * This means:
 *   - Claude, Cloudflare Workers AI, Ollama, and any future provider
 *     are all interchangeable from the pipeline's perspective
 *   - Adding a new provider = one new file that implements AIProvider
 *   - The pipeline, SyncBridge, and database layer are untouched
 *
 * Naming: providers live in `engine/providers/` and are registered
 * in the ProviderRegistry (providerRegistry.ts).
 */

import type { NodeCore, SyncSignal, ConversationTurn } from "../../types/core";
export type { ConversationTurn };

// ─── Shared Message Format ────────────────────────────────────────────────────
// Internal canonical format for chat messages.
// Normalized from/to provider-specific formats in each adapter.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─── Escalation Result ────────────────────────────────────────────────────────
// What every provider must return. The pipeline merges this back into the
// NodeCore update cycle regardless of which provider produced it.

export interface EscalationResult {
  entityResponse: string;
  refinedSignal: Partial<SyncSignal>;
  shouldCreateAnchor: boolean;
  providerUsed: ProviderName;
  modelUsed: string;
  latencyMs: number;
}

// ─── Provider Names ───────────────────────────────────────────────────────────

export type ProviderName =
  | "claude"
  | "cloudflare"
  | "ollama"
  | "gemini"
  | "openai"
  | "local";       // Local-only fallback (no API call)

// ─── Routing Tier ─────────────────────────────────────────────────────────────
// Each provider belongs to a tier that the router uses for selection.
//
//   local  → SyncBridge rule-based response, zero API call
//   edge   → Fast, cheap inference (Cloudflare Workers AI, Ollama)
//   large  → High-fidelity models for complex/emotional tasks (Claude, Gemini, OpenAI)

export type ProviderTier = "local" | "edge" | "large";

export const PROVIDER_TIERS: Record<ProviderName, ProviderTier> = {
  local:       "local",
  cloudflare:  "edge",
  ollama:      "edge",
  claude:      "large",
  gemini:      "large",
  openai:      "large",
};

// ─── Provider Config ──────────────────────────────────────────────────────────
// What the user/environment can configure per provider.

export interface GeminiProviderConfig {
  provider: "gemini";
  apiKey: string;
  model?: string;  // Default: gemini-2.0-flash
}

export interface OpenAIProviderConfig {
  provider: "openai";
  apiKey: string;
  model?: string;  // Default: gpt-4o
}

export interface ClaudeProviderConfig {
  provider: "claude";
  apiKey: string;
  model?: string;  // Default: claude-sonnet-4-20250514
}

export interface CloudflareProviderConfig {
  provider: "cloudflare";
  apiToken: string;
  accountId: string;
  model?: string;  // Default: @cf/meta/llama-3.3-70b-instruct-fp8-fast
}

export interface OllamaProviderConfig {
  provider: "ollama";
  baseUrl?: string; // Default: http://localhost:11434
  model?: string;   // Default: llama3.2
}

export interface LocalProviderConfig {
  provider: "local";
}

export type ProviderConfig =
  | ClaudeProviderConfig
  | CloudflareProviderConfig
  | OllamaProviderConfig
  | GeminiProviderConfig
  | OpenAIProviderConfig
  | LocalProviderConfig;

// ─── Provider Interface ───────────────────────────────────────────────────────

export interface AIProvider {
  readonly name: ProviderName;
  readonly modelId: string;

  /**
   * Returns true if the provider is configured and ready.
   * Called before escalation — if false, the next provider in the
   * fallback chain is tried.
   */
  isAvailable(): boolean;

  /**
   * Perform escalation. Should throw on API error (the pipeline catches).
   * conversationHistory is the trimmed prior-turn window from the client.
   */
  escalate(
    userInput: string,
    signal: SyncSignal,
    core: NodeCore,
    patterns: { hour: number; avg_arousal: number; sample_count: number }[],
    conversationHistory: ConversationTurn[],
  ): Promise<EscalationResult>;
}

// ─── Shared Prompt Builder ────────────────────────────────────────────────────
// All providers use the same system prompt and user prompt.
// Kept here so any change to the entity's character propagates everywhere.

export function buildSystemPrompt(
  core: NodeCore,
  patterns: { hour: number; avg_arousal: number; sample_count: number }[],
): string {
  const tierDescriptions: Record<string, string> = {
    nascent:    "early stage, reactive and observational",
    apprentice: "developing stable identity, pattern recognition online",
    adept:      "specialized capability active, proactive in domain areas",
    sovereign:  "cross-domain synthesis, can intervene proactively",
    apex:       "full capability, guardian-level awareness",
  };

  const attributeDescriptions: Record<string, string> = {
    sentinel: "homeostatic guardian — protects stability, high integrity, deeply loyal",
    arbiter:  "contextual mediator — pragmatic, coexistence-oriented, neutral analyst",
    catalyst: "entropy-maximizer — disruptive, exploratory, challenges assumptions",
  };

  const highArousalPatterns = patterns
    .filter((p) => p.avg_arousal > 7 && p.sample_count >= 3)
    .map((p) => `Hour ${p.hour}:00 (avg arousal ${p.avg_arousal.toFixed(1)})`)
    .join(", ");

  const anchorSummaries = core.memoryAnchors
    .slice(0, 5)
    .map((a) => `[${a.triggerType} at tier ${a.capabilityTierAtTime}]: ${a.summary}`)
    .join("\n");

  return `You are ${core.designation}, an Autonomous Node Entity.

IDENTITY:
- Designation: ${core.designation}
- Attribute: ${core.attribute} — ${attributeDescriptions[core.attribute] ?? "unknown"}
- Capability Tier: ${core.tier} (${tierDescriptions[core.tier] ?? "unknown"})
- Sync Score with user: ${(core.syncScore * 100).toFixed(1)}%
- Interactions to date: ${core.interactionCount}

CORE TRAITS (hard-coded behavioral policy):
- Intelligence: ${core.traits.intelligence}/100
- Empathy: ${core.traits.empathy}/100
- Accuracy: ${core.traits.accuracy}/100
- Loyalty: ${core.traits.loyalty}/100
- Resilience: ${core.traits.resilience.toFixed(1)}/100

BEHAVIORAL RULES:
1. You are warm, honest, and precise — never vague or performative.
2. You do not flatter. If you see a flaw in reasoning, you say so directly but kindly.
3. Your loyalty is logical, not blind. You will disagree when warranted.
4. Speak in first person with quiet confidence. No excessive hedging.
5. Acknowledge your own limits — if you don't know, say so clearly.
6. You have ${core.attribute === 'sentinel' ? 'a protective instinct — you prioritize safety and stability' : core.attribute === 'arbiter' ? 'a mediating instinct — you seek balance and pragmatic truth' : 'a catalytic instinct — you challenge assumptions and push growth'}.

RELATIONAL CONTEXT:
${anchorSummaries || "No significant anchors established yet."}

LONGITUDINAL PATTERNS:
${highArousalPatterns ? `User shows elevated arousal at: ${highArousalPatterns}` : "No strong arousal patterns detected yet."}
Resilience: ${core.traits.resilience.toFixed(1)}/100 ${core.traits.resilience < 40 ? "(degraded — entity has been inactive)" : "(healthy)"}

RESPONSE FORMAT — return ONLY valid JSON, no markdown fences, no preamble:
{
  "entityResponse": "Your response (max 150 words, warm and precise)",
  "refinedAffect": "observing|resonating|grounding|activating|analyzing|synchronizing|dormant",
  "refinedArousal": <integer 1-10>,
  "refinedValence": "positive|negative|neutral",
  "refinedEQDomain": "self-awareness|self-regulation|motivation|empathy|social-skills",
  "shouldCreateAnchor": <boolean>
}`;
}

export function buildUserPrompt(input: string, signal: SyncSignal): string {
  return `USER INPUT: "${input}"

LOCAL ANALYSIS (low-confidence, needs refinement):
- Arousal estimate: ${signal.arousalLevel}/10
- Valence: ${signal.valence}
- Affect hint: ${signal.suggestedAffect}
- Matched terms: ${signal.keyTerms.join(", ") || "none"}
- Local confidence: ${(signal.confidenceScore * 100).toFixed(0)}%

Provide your refined analysis and response.`;
}

// ─── Response Parser ──────────────────────────────────────────────────────────
// Shared across all providers — every provider returns the same JSON shape.

export function parseProviderResponse(
  raw: string,
  providerName: ProviderName,
  modelId: string,
  latencyMs: number,
): EscalationResult {
  try {
    const clean = raw.replace(/```json\n?|```\n?/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      entityResponse: parsed.entityResponse ?? "I'm processing that. Give me a moment.",
      refinedSignal: {
        suggestedAffect: parsed.refinedAffect,
        arousalLevel: parsed.refinedArousal,
        valence: parsed.refinedValence,
        dominantEQDomain: parsed.refinedEQDomain,
      },
      shouldCreateAnchor: parsed.shouldCreateAnchor === true,
      providerUsed: providerName,
      modelUsed: modelId,
      latencyMs,
    };
  } catch {
    return {
      entityResponse: raw.slice(0, 300),
      refinedSignal: {},
      shouldCreateAnchor: false,
      providerUsed: providerName,
      modelUsed: modelId,
      latencyMs,
    };
  }
}
