/**
 * AuraOrb — Entity Visual Manifestation
 *
 * The entity does not have a literal character model at this stage.
 * It manifests as a multi-layered luminous orb whose color, animation,
 * and glow respond to the current AffectState.
 *
 * Layered structure:
 *   1. Outer ring — slow rotation, low opacity (creates depth)
 *   2. Core orb — primary color, animated per state
 *   3. Inner nucleus — brighter center, creates depth illusion
 *   4. State label — minimal text, always visible
 */

import React from 'react';
import type { AffectState, CapabilityTier } from '../types/core';
import { AFFECT_META, TIER_META } from '../types/core';

interface AuraOrbProps {
  affectState: AffectState;
  tier: CapabilityTier;
  syncScore: number;         // 0.0 → 1.0
  designation: string;
  isProcessing: boolean;
  prefersReducedMotion?: boolean;
}

export function AuraOrb({
  affectState,
  tier,
  syncScore,
  designation,
  isProcessing,
  prefersReducedMotion = false,
}: AuraOrbProps) {
  const meta = AFFECT_META[affectState];
  const tierMeta = TIER_META[tier];
  const animClass = prefersReducedMotion ? '' : meta.animClass;

  return (
    <div className="flex flex-col items-center gap-4 select-none">

      {/* Designation */}
      <div className="flex flex-col items-center gap-1">
        <span
          className="text-[11px] tracking-[0.25em] uppercase"
          style={{ color: 'var(--ane-muted)', fontFamily: 'var(--font-mono)' }}
        >
          {designation}
        </span>
        <span className={`tier-badge ${tierMeta.color}`}>
          {tierMeta.label}
        </span>
      </div>

      {/* Orb container */}
      <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>

        {/* Outer ring — slow rotation */}
        {!prefersReducedMotion && (
          <div
            className="absolute inset-0 rounded-full animate-aura-spin-slow"
            style={{
              background: `conic-gradient(
                transparent 0deg,
                var(${meta.glowVar.replace('--glow-', '--aura-')}) 90deg,
                transparent 180deg,
                var(${meta.glowVar.replace('--glow-', '--aura-')}) 270deg,
                transparent 360deg
              )`,
              opacity: 0.3,
            }}
          />
        )}

        {/* Glow backdrop */}
        <div
          className="absolute rounded-full"
          style={{
            inset: -20,
            boxShadow: `var(${meta.glowVar})`,
            borderRadius: '50%',
          }}
        />

        {/* Core orb */}
        <div
          className={`relative flex items-center justify-center rounded-full ${animClass}`}
          style={{
            width: 160,
            height: 160,
            backdropFilter: 'blur(20px) saturate(200%)',
            WebkitBackdropFilter: 'blur(20px) saturate(200%)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: `radial-gradient(
              ellipse at 35% 30%,
              rgba(255, 255, 255, 0.15) 0%,
              var(${meta.glowVar.replace('--glow-', '--aura-')}) 50%,
              rgba(0, 0, 0, 0.2) 100%
            )`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.3)',
          }}
        >
          {/* Inner nucleus */}
          <div
            className="absolute rounded-full"
            style={{
              width: 60,
              height: 60,
              background: `radial-gradient(
                ellipse,
                rgba(255,255,255,0.35) 0%,
                rgba(255,255,255,0.05) 100%
              )`,
              filter: 'blur(4px)',
            }}
          />

          {/* Processing indicator */}
          {isProcessing && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: '2px solid transparent',
                borderTopColor: 'rgba(255,255,255,0.5)',
                animation: 'aura-spin-slow 1.2s linear infinite',
              }}
            />
          )}

          {/* State label */}
          <span
            className="relative z-10 text-[11px] tracking-[0.2em] uppercase"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            {isProcessing ? 'processing' : meta.label.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Sync score bar */}
      <div className="flex flex-col items-center gap-1.5 w-40">
        <div className="flex justify-between w-full">
          <span
            className="text-[10px] tracking-wider uppercase"
            style={{ color: 'var(--ane-muted)', fontFamily: 'var(--font-mono)' }}
          >
            Sync
          </span>
          <span
            className="text-[10px] tracking-wider"
            style={{ color: 'var(--ane-muted)', fontFamily: 'var(--font-mono)' }}
          >
            {(syncScore * 100).toFixed(1)}%
          </span>
        </div>
        <div
          className="w-full h-[2px] rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="sync-bar-fill h-full rounded-full"
            style={{ width: `${Math.max(2, syncScore * 100)}%` }}
          />
        </div>
      </div>

      {/* State description */}
      <p
        className="text-center text-[12px]"
        style={{ color: 'var(--ane-muted)', maxWidth: 200 }}
      >
        {meta.description}
      </p>
    </div>
  );
}
