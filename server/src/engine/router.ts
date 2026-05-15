/**
 * Task Router
 *
 * Decides which provider tier should handle each escalated interaction.
 * Runs ONLY when SyncBridge confidence < 0.75 (the local-only threshold).
 *
 * Three tiers:
 *   local  → Low-cost rule match; SyncBridge generates the response
 *   edge   → Fast cheap inference: Cloudflare Workers AI, Ollama
 *   large  → Full-capability models: Claude, Gemini, OpenAI
 *
 * Strategy: Hybrid
 *   1. Rule-based classifier runs first (< 1ms, zero cost).
 *      Strong signals for local/edge/large are decided immediately.
 *   2. If signals are ambiguous, a tiny Cloudflare Workers AI call
 *      (llama-3.2-1b) classifies the intent for ~$0.000001.
 *      Falls back to 'edge' if Cloudflare is not configured.
 *
 * Routing signals used:
 *   - signal.arousalLevel      (1–10 emotional intensity)
 *   - signal.valence           (positive | negative | neutral)
 *   - signal.confidenceScore   (0–1 SyncBridge certainty)
 *   - signal.dominantEQDomain  (Goleman EQ domain)
 *   - input length + question count
 *   - core tier proximity to next promotion threshold
 *
 * The router never throws. All errors degrade gracefully to 'edge' routing.
 */

import type { ProviderName, ProviderTier } from "./providers/interface";
import type { SyncSignal } from "../types/core";
import type { NodeCore } from "../types/core";

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface RoutingDecision {
  tier: ProviderTier;
  preferredProvider: ProviderName | null;  // null = let registry decide within tier
  usedLLMClassifier: boolean;
  signals: string[];  // human-readable reasons (for server logs only)
  latencyMs: number;
}

// ─── Routing Thresholds ───────────────────────────────────────────────────────

const AROUSAL_LARGE_THRESHOLD = 7;   // >= 7 → always large
const AROUSAL_EDGE_CEILING   = 4;   // <= 4 && not negative → edge
const LEN_LARGE_THRESHOLD    = 300; // > 300 chars AND multi-question → large
const LEN_EDGE_CEILING       = 200; // < 200 chars (factual short) → edge
const CONFIDENCE_LARGE_FLOOR = 0.30; // < 0.30 → need large model (very uncertain)

// Simple regex for factual-question openers
const FACTUAL_PREFIX = /^(what|who|when|where|how many|how much|is there|are there|can you tell me|define |explain briefly|list )/i;

// ─── Tier Promotion Proximity ─────────────────────────────────────────────────

const TIER_THRESHOLDS = [
  { from: "nascent",    to: "apprentice", count: 10,   score: 0.50 },
  { from: "apprentice", to: "adept",      count: 50,   score: 0.65 },
  { from: "adept",      to: "sovereign",  count: 200,  score: 0.80 },
  { from: "sovereign",  to: "apex",       count: 1000, score: 0.90 },
] as const;

function isApproachingPromotion(core: NodeCore): boolean {
  for (const t of TIER_THRESHOLDS) {
    if (core.tier !== t.from) continue;
    // Within 15% of count threshold OR within 5% of score threshold
    const countClose = core.interactionCount / t.count >= 0.85;
    const scoreClose = core.syncScore / t.score >= 0.95;
    if (countClose || scoreClose) return true;
  }
  return false;
}

// ─── Rule-Based Classifier ────────────────────────────────────────────────────

type RuleResult = ProviderTier | "ambiguous";

function classifyByRules(
  signal: SyncSignal,
  input: string,
  core: NodeCore,
): { result: RuleResult; signals: string[] } {
  const signals: string[] = [];
  const len = input.trim().length;
  const questionCount = (input.match(/\?/g) ?? []).length;
  const { arousalLevel, valence, confidenceScore, dominantEQDomain } = signal;

  // ── Local (handle without any API call) ────────────────────────────────────
  // Note: primary local check (confidence >= 0.75) happens in pipeline.ts
  // before the router is ever called. This catches borderline cases.
  if (len < 20 && confidenceScore >= 0.60) {
    signals.push(`short_input(${len}ch) + decent_confidence(${confidenceScore.toFixed(2)})`);
    return { result: "local", signals };
  }

  // ── Strong LARGE signals ───────────────────────────────────────────────────
  if (arousalLevel >= AROUSAL_LARGE_THRESHOLD) {
    signals.push(`high_arousal(${arousalLevel})`);
    return { result: "large", signals };
  }
  if (valence === "negative" && arousalLevel >= 6) {
    signals.push(`negative_valence + elevated_arousal(${arousalLevel})`);
    return { result: "large", signals };
  }
  if ((dominantEQDomain === "self-awareness" || dominantEQDomain === "self-regulation") && arousalLevel >= 5) {
    signals.push(`introspective_domain(${dominantEQDomain}) + arousal(${arousalLevel})`);
    return { result: "large", signals };
  }
  if (len > LEN_LARGE_THRESHOLD && questionCount >= 2) {
    signals.push(`long_input(${len}ch) + multi_question(${questionCount}?)`);
    return { result: "large", signals };
  }
  if (confidenceScore < CONFIDENCE_LARGE_FLOOR) {
    signals.push(`very_low_confidence(${confidenceScore.toFixed(2)})`);
    return { result: "large", signals };
  }
  if (isApproachingPromotion(core) && arousalLevel >= 4) {
    signals.push(`approaching_tier_promotion(${core.tier}) + arousal(${arousalLevel})`);
    return { result: "large", signals };
  }

  // ── Strong EDGE signals ────────────────────────────────────────────────────
  if (arousalLevel <= AROUSAL_EDGE_CEILING && valence !== "negative") {
    signals.push(`low_arousal(${arousalLevel}) + non_negative_valence`);
    return { result: "edge", signals };
  }
  if (FACTUAL_PREFIX.test(input) && len < LEN_EDGE_CEILING) {
    signals.push(`factual_prefix + short_input(${len}ch)`);
    return { result: "edge", signals };
  }
  if (dominantEQDomain === "social-skills" && arousalLevel <= 5) {
    signals.push(`social_skills_domain + moderate_arousal(${arousalLevel})`);
    return { result: "edge", signals };
  }
  if (dominantEQDomain === "motivation" && valence !== "negative") {
    signals.push(`motivation_domain + non_negative_valence`);
    return { result: "edge", signals };
  }

  // ── Ambiguous — needs LLM classifier ─────────────────────────────────────
  signals.push(`ambiguous: conf=${confidenceScore.toFixed(2)} arousal=${arousalLevel} valence=${valence}`);
  return { result: "ambiguous", signals };
}

// ─── LLM Classifier (Cloudflare edge model) ──────────────────────────────────
// Used only for the ambiguous zone. Extremely cheap (<$0.000001 per call).
// Prompt is intentionally minimal — we want a fast binary classification.

// Strip characters that could break out of the quoted context in the classifier prompt.
// We're not preventing the model from being "tricked" — we accept that's a low-stakes
// risk. This prevents quote-injection that could malform the prompt structure.
function sanitizeForClassifier(raw: string): string {
  return raw
    .slice(0, 200)
    .replace(/[\r\n]+/g, " ")   // collapse newlines (prompt structure attack)
    .replace(/["""]/g, "'")      // neutralise quote variants
    .replace(/[^\x20-\x7E]/g, ""); // strip non-printable / non-ASCII
}

async function classifyWithLLM(
  input: string,
  cfToken: string,
  cfAccountId: string,
): Promise<"edge" | "large"> {
  const url =
    `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run` +
    `/@cf/meta/llama-3.2-1b-instruct`;

  const safeInput = sanitizeForClassifier(input);

  const classifierPrompt =
    `Classify this message as EDGE or LARGE.\n` +
    `EDGE = factual questions, simple chat, low emotional weight.\n` +
    `LARGE = complex emotion, personal struggle, nuanced advice, deep self-reflection.\n\n` +
    `Message: '${safeInput}'\n\n` +
    `Reply with exactly one word: EDGE or LARGE`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: classifierPrompt }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(4_000),
    });

    if (!res.ok) return "edge";

    const data = await res.json() as { result?: { response?: string } };
    const reply = (data.result?.response ?? "").trim().toUpperCase();
    return reply.includes("LARGE") ? "large" : "edge";
  } catch {
    return "edge"; // Safe default on timeout or error
  }
}

// ─── Main Routing Function ────────────────────────────────────────────────────

export async function resolveRouting(
  signal: SyncSignal,
  input: string,
  core: NodeCore,
  opts: {
    cfToken?: string;
    cfAccountId?: string;
    preferredProvider?: ProviderName;
  } = {},
): Promise<RoutingDecision> {
  const start = Date.now();

  // Fast rule-based pass
  const { result: ruleResult, signals } = classifyByRules(signal, input, core);

  if (ruleResult !== "ambiguous") {
    return {
      tier: ruleResult,
      preferredProvider: opts.preferredProvider ?? null,
      usedLLMClassifier: false,
      signals,
      latencyMs: Date.now() - start,
    };
  }

  // Ambiguous: try LLM classifier if Cloudflare is configured
  let tier: ProviderTier = "edge"; // conservative default
  let usedLLMClassifier = false;

  if (opts.cfToken && opts.cfAccountId) {
    tier = await classifyWithLLM(input, opts.cfToken, opts.cfAccountId);
    usedLLMClassifier = true;
    signals.push(`llm_classifier→${tier}`);
  } else {
    signals.push("llm_classifier_unavailable→defaulting_edge");
  }

  return {
    tier,
    preferredProvider: opts.preferredProvider ?? null,
    usedLLMClassifier,
    signals,
    latencyMs: Date.now() - start,
  };
}
