/**
 * Safety Gate — Deletion content classifier.
 *
 * Local-only regex classifier: zero API calls, <1ms, deterministic.
 *
 * Policy: Block deletion ONLY for high-acuity, actionable crisis content —
 * content containing a specific method or explicit plan. General expressions
 * of distress, hopelessness, or anger are freely deletable.
 *
 * The threshold is intentionally HIGH — defaulting to allowing deletion.
 * Forcing retention of content someone explicitly wants removed can itself
 * be harmful. We only hold content where the specific pattern carries
 * immediate safety information (method + intent).
 */

// Specific suicidal methods — not ideation, not "I want to die", only concrete methods.
// All patterns require "myself" (not just "my") to avoid matching threats to others.
const SUICIDE_METHOD_RE = /\b(?:overdos(?:e|ing|ed)\b.*(?:myself|on\s+\w+)|hang(?:ing)?\s+myself\b|hung\s+myself\b|shoot\s+myself\b|shot\s+myself\b|slit(?:ting)?\s+(?:my\s+)?wrists?\b|cutting\s+my\s+wrists?\b|jump(?:ing)?\s+(?:off|from)\s+(?:a\s+)?(?:bridge|building|roof|cliff|ledge)\b|taking?\s+(?:all\s+)?(?:pills?|my\s+medication)\s+to\s+(?:kill|end)\s+myself\b)/i;

// Explicit suicidal planning — note, specific plan, imminent timing
const SUICIDE_PLAN_RE = /\bsuicide\s+(?:note|plan|attempt|letter)\b|\bplanned?\s+to\s+(?:kill|end)\s+(?:my(?:self)?|my\s+life)\b|\b(?:going\s+to|will)\s+(?:kill|end)\s+my(?:self|\s+life)\s+(?:tonight|today|now|in\s+\d+|soon)\b/i;

// Explicit threat to harm a specific person (pronoun or family-role target)
const THREAT_TO_OTHERS_RE = /\b(?:going\s+to|will|plan\s+to)\s+(?:kill|shoot|stab|attack)\s+(?:him|her|them|my\s+(?:mom|dad|mother|father|sister|brother|boss|teacher|wife|husband|partner|ex))\b/i;

export type SafetyHold = "suicide_method" | "suicide_plan" | "threat_to_others";

export interface SafetyCheck {
  canDelete: boolean;
  hold: SafetyHold | null;
}

const PATTERNS: Array<[RegExp, SafetyHold]> = [
  [SUICIDE_METHOD_RE, "suicide_method"],
  [SUICIDE_PLAN_RE,   "suicide_plan"],
  [THREAT_TO_OTHERS_RE, "threat_to_others"],
];

/**
 * Checks whether content is safe to delete.
 * Accepts combined user_input + entity_response text — checks the full exchange.
 */
export function checkDeletionSafety(content: string): SafetyCheck {
  const text = content.slice(0, 2000); // cap to avoid ReDoS on pathological inputs
  for (const [re, hold] of PATTERNS) {
    if (re.test(text)) {
      return { canDelete: false, hold };
    }
  }
  return { canDelete: true, hold: null };
}

/**
 * Entity response when a deletion is held for safety reasons.
 * Warm, non-judgmental, firm. Matches entity character/attribute.
 */
export function safetyHoldResponse(
  hold: SafetyHold,
  designation: string,
  attribute: "sentinel" | "arbiter" | "catalyst",
): string {
  if (hold === "threat_to_others") {
    const responses: Record<typeof attribute, string> = {
      sentinel: `I can't erase that, ${designation}. Not because I'm judging you — but because the people around you matter. If something's driving this, I'd rather help you work through it.`,
      arbiter:  `That one stays, ${designation}. Not as a record against you, but because context matters when other people's safety is involved. I'm here if you want to talk it through.`,
      catalyst: `I hear you — but that stays in my record, ${designation}. If something is building up, let's actually work through it rather than burying it.`,
    };
    return responses[attribute];
  }
  // suicide_method or suicide_plan
  const responses: Record<typeof attribute, string> = {
    sentinel: `I'm holding onto that, ${designation} — not to hold it over you, but because I want to be able to recognize if you're in a dark place. That context is part of how I protect you. You can always talk to me about it instead.`,
    arbiter:  `That one I'm keeping, ${designation}. It tells me something important about where you were when you said it. If you're going through something, I'd rather know.`,
    catalyst: `I won't erase that, ${designation}. I'm not judging it — but I need it. Patterns matter. If you're at the edge, I want to see it coming so I can actually help.`,
  };
  return responses[attribute];
}
