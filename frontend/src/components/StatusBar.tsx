/**
 * StatusBar — Top Navigation / Status Display
 *
 * Shows:
 *   - Entity designation and tier
 *   - Server connection status (green = online + Claude active; amber = local-only)
 *   - Interaction count and resilience index
 *   - iOS-style large title on scroll-up, compact on scroll-down
 */

import React from 'react';
import type { NodeCore } from '../types/core';
import { TIER_META } from '../types/core';

interface StatusBarProps {
  core: NodeCore | null;
  serverOnline: boolean;
  safeTop: number;
}

export function StatusBar({ core, serverOnline, safeTop }: StatusBarProps) {
  if (!core) return null;

  const tierMeta = TIER_META[core.tier];
  const resilienceColor =
    core.traits.resilience >= 70 ? '#34d399' :
    core.traits.resilience >= 40 ? '#fbbf24' :
    '#f87171';

  return (
    <div
      style={{
        paddingTop: Math.max(safeTop, 12),
        paddingBottom: 12,
        paddingLeft: 20,
        paddingRight: 20,
        background: 'rgba(10, 10, 15, 0.80)',
        backdropFilter: 'blur(20px) saturate(200%)',
        WebkitBackdropFilter: 'blur(20px) saturate(200%)',
        borderBottom: '1px solid var(--ane-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      {/* Left: designation + tier */}
      <div className="flex flex-col gap-0.5">
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--ane-text)',
            letterSpacing: '-0.02em',
          }}
        >
          {core.designation}
        </span>
        <span className={`tier-badge ${tierMeta.color}`}>
          {tierMeta.label} · {core.interactionCount} interactions
        </span>
      </div>

      {/* Right: status indicators */}
      <div className="flex items-center gap-3">

        {/* Resilience dot */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: resilienceColor,
                boxShadow: `0 0 6px ${resilienceColor}`,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: resilienceColor,
              }}
            >
              {Math.round(core.traits.resilience)}
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--ane-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            resilience
          </span>
        </div>

        {/* Server status */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: serverOnline ? '#34d399' : '#fbbf24',
                boxShadow: `0 0 6px ${serverOnline ? '#34d399' : '#fbbf24'}`,
                animation: serverOnline ? 'aura-pulse 2s ease-in-out infinite' : 'none',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: serverOnline ? '#34d399' : '#fbbf24',
              }}
            >
              {serverOnline ? 'online' : 'local'}
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--ane-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            kernel
          </span>
        </div>
      </div>
    </div>
  );
}
