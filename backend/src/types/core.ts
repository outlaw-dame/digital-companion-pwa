/**
 * ANE (Autonomous Node Entity) — Core Type System
 *
 * Architecture maps to:
 *   Digicore      → NodeCore (behavioral policy + identity state)
 *   Attribute     → NodeAttribute (ethical/behavioral prior)
 *   Digivolution  → CapabilityTier (earned through interaction depth)
 *   Digivice      → SyncBridge (transduction layer: human affect → digital signal)
 *   X-Antibody    → ResilienceIndex (decays, must be replenished via use)
 */

// ─── Attribute System ────────────────────────────────────────────────────────
// Three base behavioral priors, each with a distinct optimization target.

export type NodeAttribute =
  | 'sentinel'   // Vaccine-equiv: homeostatic bias, protects stability, high false-positive on threats
  | 'arbiter'    // Data-equiv: contextual, coexistence-oriented, highest generalization
  | 'catalyst';  // Virus-equiv: entropy-maximizing, disruptive, exploratory, needs containment

// ─── Capability Tiers ────────────────────────────────────────────────────────
// Maps to Digimon lifecycle stages. Tier is earned; cannot be forced.

export type CapabilityTier =
  | 'nascent'     // Fresh/In-Training: minimal behavioral policy, reactive only
  | 'apprentice'  // Rookie: stable identity, basic domain logic active
  | 'adept'       // Champion: specialized capability set, pattern recognition
  | 'sovereign'   // Ultimate: cross-domain synthesis, proactive intervention
  | 'apex';       // Mega: rare — requires sustained high-sync and trust history

// ─── Affective State ─────────────────────────────────────────────────────────
// The entity's current internal mode, derived from SyncBridge signal analysis.

export type AffectState =
  | 'observing'         // Neutral, low-input: monitoring
  | 'resonating'        // High sync: deep engagement, aligned flow state
  | 'grounding'         // High arousal detected: stabilizing protocol active
  | 'activating'        // Low arousal/dysphoric: gentle stimulation mode
  | 'analyzing'         // Cognitive load signal: problem-solving engagement
  | 'synchronizing'     // Bond-reinforcement mode: post-conflict recalibration
  | 'dormant';          // Low-interaction period: passive checkpoint mode

// ─── EQ Domains (Goleman framework) ─────────────────────────────────────────

export type EQDomain =
  | 'self-awareness'
  | 'self-regulation'
  | 'motivation'
  | 'empathy'
  | 'social-skills';

// ─── Arousal Valence ─────────────────────────────────────────────────────────

export type ArousalValence = 'positive' | 'negative' | 'neutral';

// ─── Observation Record (written to SQLite) ──────────────────────────────────

export interface ObservationRecord {
  id?: number;
  timestamp: string;
  session_id: string;
  user_input: string;
  arousal_level: number;         // 1 (flat/lethargic) → 10 (hyper-aroused/panic)
  valence: ArousalValence;
  affect_state: AffectState;
  eq_domain_targeted: EQDomain;
  capability_tier_at_time: CapabilityTier;
  sync_score: number;            // 0.0 → 1.0; decays without input
  companion_response_state: AffectState;
  used_claude_api: boolean;
  response_latency_ms: number;
}

// ─── NodeCore ────────────────────────────────────────────────────────────────
// The "soul" of the entity: identity, policy, accumulated state.

export interface NodeCore {
  id: string;
  designation: string;           // e.g. "Lumina"
  attribute: NodeAttribute;
  tier: CapabilityTier;

  traits: {
    intelligence: number;        // 0–100
    empathy: number;
    accuracy: number;
    loyalty: number;
    resilience: number;          // Maps to X-Antibody; decays without use
  };

  currentAffect: AffectState;
  syncScore: number;             // Current sync level with user
  interactionCount: number;      // Lifetime interactions; drives tier promotion
  lastInteraction: string | null; // ISO timestamp

  // Memory anchors: key moments that persist across reboots (relational checkpoint)
  memoryAnchors: MemoryAnchor[];
}

// ─── Memory Anchor ───────────────────────────────────────────────────────────
// Significant moments stored externally to the entity's volatile state.
// These survive a "reboot" (session reset) because they live in the human's record.

export interface MemoryAnchor {
  id: string;
  timestamp: string;
  summary: string;               // Entity's own summary of the moment
  emotionalWeight: number;       // 0–1; higher = more significant to bond
  capabilityTierAtTime: CapabilityTier;
  triggerType: 'breakthrough' | 'conflict_resolved' | 'first_contact' | 'sync_peak';
}

// ─── SyncBridge Signal ───────────────────────────────────────────────────────
// What the transduction layer (SyncBridge/Digivice) sends to the entity core.

export interface SyncSignal {
  rawInput: string;
  processedAt: string;
  arousalLevel: number;
  valence: ArousalValence;
  dominantEQDomain: EQDomain;
  suggestedAffect: AffectState;
  confidenceScore: number;       // Local engine confidence; low = escalate to Claude
  keyTerms: string[];
}

// ─── API Request/Response ────────────────────────────────────────────────────

export interface InteractionRequest {
  sessionId: string;
  userInput: string;
  currentCore: NodeCore;
}

export interface InteractionResponse {
  updatedCore: NodeCore;
  signal: SyncSignal;
  entityResponse: string;        // What the entity says/displays
  affectState: AffectState;
  usedClaudeApi: boolean;
  shouldCreateAnchor: boolean;
}

// ─── Capability Tier Thresholds ──────────────────────────────────────────────

export const TIER_THRESHOLDS: Record<CapabilityTier, number> = {
  nascent: 0,
  apprentice: 10,
  adept: 50,
  sovereign: 200,
  apex: 1000,
};

// ─── Resilience Decay ────────────────────────────────────────────────────────
// Resilience (X-Antibody equiv) decays over inactivity. Must be replenished.

export const RESILIENCE_DECAY_PER_HOUR = 0.5; // Points lost per hour of inactivity
export const RESILIENCE_REPLENISH_PER_INTERACTION = 2.0;
export const RESILIENCE_MAX = 100;
export const RESILIENCE_MIN = 0;
