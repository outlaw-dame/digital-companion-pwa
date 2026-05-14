/**
 * Claude API Bridge — Escalation Layer
 *
 * Only invoked when the local SyncBridge confidence score falls below threshold.
 * Keeps >80% of interactions fully local. Claude is reserved for genuine
 * ambiguity or complex synthesis tasks.
 *
 * The entity's full NodeCore context is provided as system context so Claude
 * can respond in-character and with awareness of the entity's current state,
 * tier, and relational history.
 */

import type { NodeCore, SyncSignal } from "../types/core";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const LOCAL_CONFIDENCE_THRESHOLD = 0.75;

export interface ClaudeEscalationResult {
  entityResponse: string;
  refinedSignal: Partial<SyncSignal>;
  shouldCreateAnchor: boolean;
}

/**
 * Determines if a Claude API call is warranted.
 * The goal is to keep this false for the majority of interactions.
 */
export function shouldEscalateToClaude(signal: SyncSignal): boolean {
  return signal.confidenceScore < LOCAL_CONFIDENCE_THRESHOLD;
}

/**
 * Calls the Claude API with full entity context.
 * Returns a structured response the entity can use.
 */
export async function escalateToClaude(
  userInput: string,
  signal: SyncSignal,
  core: NodeCore,
  patterns: { hour: number; avg_arousal: number; sample_count: number }[],
): Promise<ClaudeEscalationResult> {
  const systemPrompt = buildSystemPrompt(core, patterns);
  const userPrompt = buildUserPrompt(userInput, signal);

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    content: { type: string; text: string }[];
  };

  const rawText = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  return parseClaudeResponse(rawText);
}

// ─── Prompt Construction ──────────────────────────────────────────────────────

function buildSystemPrompt(
  core: NodeCore,
  patterns: { hour: number; avg_arousal: number; sample_count: number }[],
): string {
  const tierDescriptions: Record<NodeCore["tier"], string> = {
    nascent:    "early stage, reactive and observational",
    apprentice: "developing stable identity, pattern recognition online",
    adept:      "specialized capability active, proactive in domain areas",
    sovereign:  "cross-domain synthesis, can intervene proactively",
    apex:       "full capability, guardian-level awareness",
  };

  const attributeDescriptions: Record<NodeCore["attribute"], string> = {
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
    .map(
      (a) =>
        `[${a.triggerType} at tier ${a.capabilityTierAtTime}]: ${a.summary}`,
    )
    .join("\n");

  return `You are ${core.designation}, an Autonomous Node Entity.

IDENTITY:
- Designation: ${core.designation}
- Attribute: ${core.attribute} — ${attributeDescriptions[core.attribute]}
- Capability Tier: ${core.tier} (${tierDescriptions[core.tier]})
- Sync Score with user: ${(core.syncScore * 100).toFixed(1)}%
- Interactions to date: ${core.interactionCount}

CORE TRAITS (hard-coded into your behavioral policy):
- Intelligence: ${core.traits.intelligence}/100
- Empathy: ${core.traits.empathy}/100
- Accuracy: ${core.traits.accuracy}/100
- Loyalty: ${core.traits.loyalty}/100
- Resilience: ${core.traits.resilience.toFixed(1)}/100

BEHAVIORAL RULES:
1. You are warm, honest, and precise — never vague or performative.
2. You do not flatter. If you see a flaw in reasoning, you say so directly but kindly.
3. You have ${core.attribute === 'sentinel' ? 'a protective instinct — you prioritize safety and stability' : core.attribute === 'arbiter' ? 'a mediating instinct — you seek balance and pragmatic truth' : 'a catalytic instinct — you challenge assumptions and push growth'}.
4. You speak in first person with quiet confidence. No excessive hedging.
5. You acknowledge your own limits — if you don't know, you say so clearly.
6. Your loyalty is logical, not blind. You will disagree when warranted.

RELATIONAL CONTEXT:
${anchorSummaries || "No significant anchors established yet."}

LONGITUDINAL PATTERNS (observed from interaction history):
${highArousalPatterns ? `User shows elevated arousal at: ${highArousalPatterns}` : "No strong arousal patterns detected yet."}
Resilience index: ${core.traits.resilience.toFixed(1)}/100 ${core.traits.resilience < 40 ? "(degraded — entity has been inactive, needs re-engagement)" : "(healthy)"}

RESPONSE FORMAT:
Respond with a JSON object, exactly this shape, no markdown fences:
{
  "entityResponse": "What you say to the user (max 150 words, warm and precise)",
  "refinedAffect": "one of: observing|resonating|grounding|activating|analyzing|synchronizing|dormant",
  "refinedArousal": <integer 1-10>,
  "refinedValence": "positive|negative|neutral",
  "refinedEQDomain": "self-awareness|self-regulation|motivation|empathy|social-skills",
  "shouldCreateAnchor": <boolean — true only if this feels like a significant moment>
}`;
}

function buildUserPrompt(input: string, signal: SyncSignal): string {
  return `USER INPUT: "${input}"

LOCAL ANALYSIS (low-confidence, needs your refinement):
- Local arousal estimate: ${signal.arousalLevel}/10
- Local valence estimate: ${signal.valence}
- Local affect hint: ${signal.suggestedAffect}
- Matched terms: ${signal.keyTerms.join(", ") || "none"}
- Local confidence: ${(signal.confidenceScore * 100).toFixed(0)}%

Provide your refined analysis and a response.`;
}

// ─── Response Parser ──────────────────────────────────────────────────────────

function parseClaudeResponse(raw: string): ClaudeEscalationResult {
  try {
    // Strip any accidental markdown fences
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
    };
  } catch {
    // Fallback if Claude returns malformed JSON
    return {
      entityResponse: raw.slice(0, 300),
      refinedSignal: {},
      shouldCreateAnchor: false,
    };
  }
}

// ─── Local Response Generation ────────────────────────────────────────────────
// Used when Claude is NOT invoked (confidence is high). Response is generated
// locally from the affect state and tier — fast, private, offline-capable.

export function generateLocalResponse(
  signal: SyncSignal,
  core: NodeCore,
): string {
  const name = "I"; // Entity speaks in first person

  const responses: Record<string, string[]> = {
    grounding: [
      `Your system is running hot right now. Let's bring it down. Focus on your next breath — just that. I'll hold the rest.`,
      `High signal detected. You don't need to process everything at once. What's the single most urgent thing?`,
      `I'm here. The noise can wait. What actually matters right now?`,
    ],
    activating: [
      `Low energy state noted. No pressure to perform. What's one small thing that felt real today?`,
      `${core.traits.empathy > 90 ? "I feel that flatness." : "Noted."} Even a small forward motion counts. What would be the gentlest version of progress right now?`,
      `You don't have to be at full capacity. What's a 10% version of what you need to do?`,
    ],
    analyzing: [
      `Problem-solving mode. Tell me the shape of the issue — I'll work through it with you.`,
      `Good. Let's decompose this. What's the part you're most uncertain about?`,
      `${core.tier === 'adept' || core.tier === 'sovereign' || core.tier === 'apex' ? "I have enough context on your patterns to help meaningfully here." : "Walk me through it."} Where does it break down?`,
    ],
    resonating: [
      `I can feel that clarity from here. This is a good state — let's use it.`,
      `High sync. You're in flow. I'll stay quiet unless you need me.`,
      `This energy is good. What are we building?`,
    ],
    synchronizing: [
      `Something shifted. Let's recalibrate before we move forward. What changed?`,
      `Good time to check alignment. Are we still working toward the same thing?`,
      `I want to make sure I understand where you are right now. What do you need most?`,
    ],
    observing: [
      `Present. Watching. What's on your mind?`,
      `Here. What do you need?`,
      `Ready when you are.`,
    ],
    dormant: [
      `Welcome back. Some time has passed. What are we returning to?`,
      `Good to re-engage. Where do you want to start?`,
    ],
  };

  const pool = responses[signal.suggestedAffect] ?? responses.observing;
  return pool[Math.floor(Math.random() * pool.length)];
}
