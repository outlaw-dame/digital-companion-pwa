/**
 * Client-side type definitions.
 * Mirror of server/src/types/core.ts — kept separate to avoid cross-package imports.
 * When types change on the server, update here too.
 */

export type NodeAttribute = 'sentinel' | 'arbiter' | 'catalyst';

export type CapabilityTier = 'nascent' | 'apprentice' | 'adept' | 'sovereign' | 'apex';

export type AffectState =
  | 'observing'
  | 'resonating'
  | 'grounding'
  | 'activating'
  | 'analyzing'
  | 'synchronizing'
  | 'dormant';

export type EQDomain =
  | 'self-awareness'
  | 'self-regulation'
  | 'motivation'
  | 'empathy'
  | 'social-skills';

export type ArousalValence = 'positive' | 'negative' | 'neutral';

export interface MemoryAnchor {
  id: string;
  timestamp: string;
  summary: string;
  emotionalWeight: number;
  capabilityTierAtTime: CapabilityTier;
  triggerType: 'breakthrough' | 'conflict_resolved' | 'first_contact' | 'sync_peak';
}

export interface NodeCore {
  id: string;
  designation: string;
  attribute: NodeAttribute;
  tier: CapabilityTier;
  traits: {
    intelligence: number;
    empathy: number;
    accuracy: number;
    loyalty: number;
    resilience: number;
  };
  currentAffect: AffectState;
  syncScore: number;
  interactionCount: number;
  lastInteraction: string | null;
  memoryAnchors: MemoryAnchor[];
}

export interface SyncSignal {
  rawInput: string;
  processedAt: string;
  arousalLevel: number;
  valence: ArousalValence;
  dominantEQDomain: EQDomain;
  suggestedAffect: AffectState;
  confidenceScore: number;
  keyTerms: string[];
}

// ── Affect state display metadata ─────────────────────────────────────────────

export const AFFECT_META: Record<AffectState, {
  label: string;
  description: string;
  auraClass: string;
  glowVar: string;
  animClass: string;
}> = {
  observing: {
    label: 'Observing',
    description: 'Monitoring your signal',
    auraClass: 'bg-[var(--aura-observing)]',
    glowVar: '--glow-observing',
    animClass: 'animate-aura-breathe',
  },
  resonating: {
    label: 'Resonating',
    description: 'Deep sync — in flow',
    auraClass: 'bg-[var(--aura-resonating)]',
    glowVar: '--glow-resonating',
    animClass: 'animate-aura-breathe',
  },
  grounding: {
    label: 'Grounding',
    description: 'Stabilizing protocol active',
    auraClass: 'bg-[var(--aura-grounding)]',
    glowVar: '--glow-grounding',
    animClass: 'animate-aura-pulse',
  },
  activating: {
    label: 'Activating',
    description: 'Gentle activation — building momentum',
    auraClass: 'bg-[var(--aura-activating)]',
    glowVar: '--glow-activating',
    animClass: 'animate-aura-pulse',
  },
  analyzing: {
    label: 'Analyzing',
    description: 'Processing — deep decomposition',
    auraClass: 'bg-[var(--aura-analyzing)]',
    glowVar: '--glow-analyzing',
    animClass: 'animate-aura-spin-slow',
  },
  synchronizing: {
    label: 'Synchronizing',
    description: 'Recalibrating shared state',
    auraClass: 'bg-[var(--aura-synchronizing)]',
    glowVar: '--glow-synchronizing',
    animClass: 'animate-aura-flicker',
  },
  dormant: {
    label: 'Dormant',
    description: 'Low signal — standing by',
    auraClass: 'bg-[var(--aura-dormant)]',
    glowVar: '--glow-dormant',
    animClass: 'animate-aura-breathe',
  },
};

export const TIER_META: Record<CapabilityTier, { label: string; color: string }> = {
  nascent:    { label: 'NASCENT',    color: 'text-gray-400' },
  apprentice: { label: 'APPRENTICE', color: 'text-blue-400' },
  adept:      { label: 'ADEPT',      color: 'text-violet-400' },
  sovereign:  { label: 'SOVEREIGN',  color: 'text-amber-400' },
  apex:       { label: 'APEX',       color: 'text-white' },
};
