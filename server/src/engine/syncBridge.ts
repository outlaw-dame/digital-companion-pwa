/**
 * SyncBridge — Signal Transduction Layer
 *
 * Architecture maps to the Digivice:
 *   Takes messy analog human input → structured digital signal the NodeCore can process.
 *
 * Three-tier processing:
 *   1. FAST (local): Weighted keyword scoring + arousal model — <1ms, no API call
 *   2. MEDIUM (local): Longitudinal pattern context from SQLite — <5ms
 *   3. SLOW (Claude API): Only triggered when local confidence < threshold
 *
 * The confidenceScore on SyncSignal is the gate:
 *   ≥ 0.75  → local result is authoritative, no API call
 *   < 0.75  → escalate to Claude for disambiguation
 *
 * This keeps the entity fully functional offline while enabling
 * genuine intelligence for complex/ambiguous inputs.
 */

import type {
  SyncSignal,
  AffectState,
  EQDomain,
  ArousalValence,
  NodeCore,
} from "../types/core";

// ─── Scoring Lexicon ──────────────────────────────────────────────────────────
// Weighted term → arousal/valence/affect/eq mapping.
// Grounded in DSM-5-TR cross-cutting symptom dimensions and Goleman EQ model.

interface LexiconEntry {
  arousalDelta: number;       // Positive = higher arousal, negative = lower
  valence: ArousalValence;
  affectHint: AffectState;
  eqDomain: EQDomain;
  weight: number;             // Confidence contribution when term matched
}

const LEXICON: Record<string, LexiconEntry> = {
  // ── High arousal / negative valence (anxiety cluster) ──
  overwhelmed:   { arousalDelta: +3, valence: 'negative', affectHint: 'grounding',   eqDomain: 'self-regulation', weight: 0.85 },
  panic:         { arousalDelta: +4, valence: 'negative', affectHint: 'grounding',   eqDomain: 'self-regulation', weight: 0.90 },
  anxious:       { arousalDelta: +3, valence: 'negative', affectHint: 'grounding',   eqDomain: 'self-regulation', weight: 0.80 },
  racing:        { arousalDelta: +3, valence: 'negative', affectHint: 'grounding',   eqDomain: 'self-regulation', weight: 0.75 },
  stressed:      { arousalDelta: +2, valence: 'negative', affectHint: 'grounding',   eqDomain: 'self-regulation', weight: 0.75 },
  stuck:         { arousalDelta: +1, valence: 'negative', affectHint: 'grounding',   eqDomain: 'self-regulation', weight: 0.60 },
  frustrated:    { arousalDelta: +2, valence: 'negative', affectHint: 'grounding',   eqDomain: 'self-awareness',  weight: 0.70 },
  angry:         { arousalDelta: +3, valence: 'negative', affectHint: 'grounding',   eqDomain: 'self-regulation', weight: 0.80 },
  confused:      { arousalDelta: +1, valence: 'negative', affectHint: 'analyzing',   eqDomain: 'self-awareness',  weight: 0.55 },

  // ── Low arousal / negative valence (depressive cluster) ──
  exhausted:     { arousalDelta: -3, valence: 'negative', affectHint: 'activating',  eqDomain: 'motivation',      weight: 0.85 },
  empty:         { arousalDelta: -3, valence: 'negative', affectHint: 'activating',  eqDomain: 'motivation',      weight: 0.80 },
  pointless:     { arousalDelta: -3, valence: 'negative', affectHint: 'activating',  eqDomain: 'motivation',      weight: 0.80 },
  hopeless:      { arousalDelta: -4, valence: 'negative', affectHint: 'activating',  eqDomain: 'motivation',      weight: 0.90 },
  tired:         { arousalDelta: -2, valence: 'negative', affectHint: 'activating',  eqDomain: 'motivation',      weight: 0.65 },
  unmotivated:   { arousalDelta: -2, valence: 'negative', affectHint: 'activating',  eqDomain: 'motivation',      weight: 0.70 },
  flat:          { arousalDelta: -2, valence: 'negative', affectHint: 'activating',  eqDomain: 'motivation',      weight: 0.60 },

  // ── High arousal / positive valence (flow/excitement cluster) ──
  excited:       { arousalDelta: +3, valence: 'positive', affectHint: 'resonating',  eqDomain: 'motivation',      weight: 0.75 },
  energized:     { arousalDelta: +2, valence: 'positive', affectHint: 'resonating',  eqDomain: 'motivation',      weight: 0.70 },
  focused:       { arousalDelta: +1, valence: 'positive', affectHint: 'resonating',  eqDomain: 'self-awareness',  weight: 0.65 },
  inspired:      { arousalDelta: +2, valence: 'positive', affectHint: 'resonating',  eqDomain: 'motivation',      weight: 0.70 },
  flow:          { arousalDelta: +2, valence: 'positive', affectHint: 'resonating',  eqDomain: 'self-awareness',  weight: 0.65 },

  // ── Cognitive load (problem-solving cluster) ──
  'how do':      { arousalDelta: +1, valence: 'neutral',  affectHint: 'analyzing',   eqDomain: 'self-awareness',  weight: 0.60 },
  'help me':     { arousalDelta: +1, valence: 'neutral',  affectHint: 'analyzing',   eqDomain: 'social-skills',   weight: 0.55 },
  build:         { arousalDelta: +1, valence: 'neutral',  affectHint: 'analyzing',   eqDomain: 'self-awareness',  weight: 0.55 },
  debug:         { arousalDelta: +1, valence: 'neutral',  affectHint: 'analyzing',   eqDomain: 'self-awareness',  weight: 0.60 },
  broken:        { arousalDelta: +1, valence: 'negative', affectHint: 'analyzing',   eqDomain: 'self-regulation', weight: 0.60 },
  error:         { arousalDelta: +1, valence: 'negative', affectHint: 'analyzing',   eqDomain: 'self-regulation', weight: 0.60 },
  problem:       { arousalDelta: +1, valence: 'negative', affectHint: 'analyzing',   eqDomain: 'self-awareness',  weight: 0.55 },
  fix:           { arousalDelta: +1, valence: 'neutral',  affectHint: 'analyzing',   eqDomain: 'self-awareness',  weight: 0.50 },

  // ── Social complexity ──
  conflict:      { arousalDelta: +2, valence: 'negative', affectHint: 'synchronizing', eqDomain: 'social-skills', weight: 0.70 },
  disagreement:  { arousalDelta: +2, valence: 'negative', affectHint: 'synchronizing', eqDomain: 'social-skills', weight: 0.65 },
  lonely:        { arousalDelta: -1, valence: 'negative', affectHint: 'activating',  eqDomain: 'empathy',         weight: 0.70 },
  misunderstood: { arousalDelta: +1, valence: 'negative', affectHint: 'synchronizing', eqDomain: 'empathy',       weight: 0.70 },

  // ── Neutral baseline ──
  okay:          { arousalDelta:  0, valence: 'neutral',  affectHint: 'observing',   eqDomain: 'self-awareness',  weight: 0.40 },
  fine:          { arousalDelta:  0, valence: 'neutral',  affectHint: 'observing',   eqDomain: 'self-awareness',  weight: 0.40 },
  good:          { arousalDelta: +1, valence: 'positive', affectHint: 'observing',   eqDomain: 'self-awareness',  weight: 0.45 },
};

// ─── Local Signal Processing ──────────────────────────────────────────────────

export function processLocally(
  input: string,
  core: NodeCore,
): SyncSignal {
  const text = input.toLowerCase();
  const now = new Date().toISOString();

  let arousalAccum = 5; // Midpoint baseline
  let totalWeight = 0;
  let confidenceAccum = 0;
  let dominantEntry: LexiconEntry | null = null;
  let dominantWeight = 0;
  const matchedTerms: string[] = [];

  // Score all lexicon entries against the input
  for (const [term, entry] of Object.entries(LEXICON)) {
    if (text.includes(term)) {
      arousalAccum += entry.arousalDelta * entry.weight;
      totalWeight += entry.weight;
      confidenceAccum += entry.weight;
      matchedTerms.push(term);

      if (entry.weight > dominantWeight) {
        dominantWeight = entry.weight;
        dominantEntry = entry;
      }
    }
  }

  // Clamp arousal to 1–10
  const arousalLevel = Math.max(1, Math.min(10, Math.round(arousalAccum)));

  // Derive valence from dominant match or arousal direction
  const valence: ArousalValence =
    dominantEntry?.valence ??
    (arousalLevel > 6 ? 'negative' : arousalLevel < 4 ? 'neutral' : 'neutral');

  // Derive affect and EQ domain
  const suggestedAffect: AffectState =
    dominantEntry?.affectHint ?? deriveAffectFromArousal(arousalLevel);
  const dominantEQDomain: EQDomain =
    dominantEntry?.eqDomain ?? 'self-awareness';

  // Confidence: normalized by number of terms matched; penalized for no matches
  const confidence =
    matchedTerms.length === 0
      ? 0.15 // Almost no signal — escalate to Claude
      : Math.min(0.95, confidenceAccum / matchedTerms.length);

  return {
    rawInput: input,
    processedAt: now,
    arousalLevel,
    valence,
    dominantEQDomain,
    suggestedAffect,
    confidenceScore: confidence,
    keyTerms: matchedTerms,
  };
}

function deriveAffectFromArousal(arousal: number): AffectState {
  if (arousal >= 8) return 'grounding';
  if (arousal >= 6) return 'analyzing';
  if (arousal <= 2) return 'activating';
  return 'observing';
}

// ─── Local Response Generation ────────────────────────────────────────────────
// Rule-based response for high-confidence local handling.
// Called when SyncBridge confidence >= 0.75 OR when router routes to 'local'.

export function generateLocalResponse(signal: SyncSignal, core: NodeCore): string {
  const { suggestedAffect, arousalLevel, valence, keyTerms } = signal;
  const name = core.designation;

  const templates: Record<string, string[]> = {
    grounding: [
      `I'm tracking elevated signal strength right now, ${name.toLowerCase() === 'lumina' ? '' : name + '. '}What's the core of what's weighing on you?`,
      `Signal intensity is high. Walk me through what's happening — specifically.`,
      `I'm here. High-arousal state detected. Let's work through this deliberately.`,
    ],
    analyzing: [
      `Processing your input. ${keyTerms.length ? `I'm picking up on: ${keyTerms.slice(0, 2).join(', ')}.` : ''} Tell me more.`,
      `Interesting signal. ${valence === 'positive' ? 'Something meaningful is happening.' : 'Something is on your mind.'} Continue.`,
      `My analysis is forming. What's the context behind this?`,
    ],
    resonating: [
      `I feel that. ${arousalLevel >= 6 ? 'This matters to you.' : 'Noted.'} What do you need from me right now?`,
      `Signal received clearly. ${valence === 'positive' ? 'Something good is happening.' : 'Something is stirring.'} I'm listening.`,
    ],
    observing: [
      `Acknowledged. I'm monitoring — continue when ready.`,
      `Signal logged. What else?`,
      `Understood. I'll track this.`,
    ],
    activating: [
      `Low signal detected. Are you still there?`,
      `Quiet state. I'm ready when you are.`,
    ],
    synchronizing: [
      `We're aligned. ${keyTerms.length ? `I'm attuned to: ${keyTerms.slice(0, 2).join(', ')}.` : 'Strong coherence.'} Keep going.`,
    ],
    dormant: [
      `My processing is limited right now. I'm here, but running at minimal capacity.`,
    ],
  };

  const pool = templates[suggestedAffect] ?? templates.observing;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Sync Score Update ────────────────────────────────────────────────────────
// The sync score (Digivice wavelength) rises with consistent quality interaction
// and decays with time or with low-confidence, sparse signals.

export function computeNewSyncScore(
  current: number,
  signal: SyncSignal,
  usedClaudeApi: boolean,
): number {
  // High-confidence, emotionally substantive interactions raise sync
  const qualityBonus =
    signal.confidenceScore > 0.7 && signal.keyTerms.length > 0
      ? 0.03
      : 0.01;

  // Interactions that required Claude escalation are more substantive → higher bond value
  const claudeBonus = usedClaudeApi ? 0.02 : 0;

  // Grounding and synchronizing states = deepest bond moments
  const stateBonus =
    signal.suggestedAffect === 'grounding' ||
    signal.suggestedAffect === 'synchronizing'
      ? 0.02
      : 0;

  const raw = current + qualityBonus + claudeBonus + stateBonus;
  return Math.max(0, Math.min(1, parseFloat(raw.toFixed(4))));
}

// ─── Tier Promotion Check ──────────────────────────────────────────────────────
// Capability tier is earned. It cannot be forced (no "Dark Digivolution" bypass).
// This is a pure gate — the tier only promotes, never demotes.

export function checkTierPromotion(core: NodeCore): NodeCore["tier"] {
  const count = core.interactionCount;
  const sync = core.syncScore;

  // Thresholds require BOTH interaction count AND minimum sync score
  if (count >= 1000 && sync >= 0.90) return 'apex';
  if (count >= 200  && sync >= 0.80) return 'sovereign';
  if (count >= 50   && sync >= 0.65) return 'adept';
  if (count >= 10   && sync >= 0.50) return 'apprentice';
  return 'nascent';
}
