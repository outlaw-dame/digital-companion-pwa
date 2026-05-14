/**
 * App — Root Component
 *
 * Platform-aware layout:
 *   - iOS: Konsta UI with `theme="ios"`, safe areas applied, no hover states
 *   - Android: Konsta UI with `theme="material"`, ripple effects enabled
 *   - Desktop: Centered card layout, standard hover states
 *
 * The layout is a single-column "native app" structure:
 *   [StatusBar] → fixed top
 *   [AuraOrb]   → entity visual, fixed in upper section
 *   [MessageFeed] → scrollable middle
 *   [SyncInput] → fixed bottom, above home bar
 */

import React, { useState } from 'react';
import { App as KonstaApp, Page } from 'konsta/react';
import { usePlatform } from './hooks/usePlatform';
import { useANE } from './hooks/useANE';
import { AuraOrb } from './components/AuraOrb';
import { MessageFeed } from './components/MessageFeed';
import { SyncInput } from './components/SyncInput';
import { StatusBar } from './components/StatusBar';
import './index.css';

type View = 'companion' | 'feed';

export default function App() {
  const platform = usePlatform();
  const ane = useANE();
  const [activeView, setActiveView] = useState<View>('companion');

  const core = ane.core;
  if (!core) return null;

  const safeBottom = platform.safeAreas.bottom || 0;
  const safeTop = platform.safeAreas.top || 0;

  return (
    <KonstaApp
      theme={platform.theme}
      dark
      safeAreas={false} // We handle safe areas manually for full control
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh', // Dynamic viewport height — handles iOS keyboard
          background: 'var(--ane-void)',
          overflow: 'hidden',
          maxWidth: platform.platform === 'desktop' ? 480 : '100%',
          margin: platform.platform === 'desktop' ? '0 auto' : undefined,
        }}
      >
        {/* Status Bar */}
        <StatusBar
          core={core}
          serverOnline={ane.serverOnline}
          safeTop={safeTop}
        />

        {/* View toggle — iOS segmented style */}
        <div
          className="flex items-center justify-center px-6 py-3"
          style={{
            borderBottom: '1px solid var(--ane-border)',
            flexShrink: 0,
          }}
        >
          <div
            className="flex rounded-[10px] p-[3px]"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            {(['companion', 'feed'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                style={{
                  padding: '6px 20px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: activeView === v ? 600 : 400,
                  color: activeView === v ? 'var(--ane-text)' : 'var(--ane-muted)',
                  background: activeView === v
                    ? 'rgba(255,255,255,0.12)'
                    : 'transparent',
                  transition: 'all 0.2s ease',
                  letterSpacing: '-0.01em',
                }}
              >
                {v === 'companion' ? 'Entity' : 'Feed'}
              </button>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {activeView === 'companion' ? (
            /* Companion view: Orb + summary stats */
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 scroll-area">
              <AuraOrb
                affectState={core.currentAffect}
                tier={core.tier}
                syncScore={core.syncScore}
                designation={core.designation}
                isProcessing={ane.isProcessing}
                prefersReducedMotion={platform.prefersReducedMotion}
              />

              {/* Trait grid */}
              <div
                className="w-full rounded-[20px] p-4"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--ane-border)',
                }}
              >
                <div className="grid grid-cols-2 gap-3">
                  {(Object.entries(core.traits) as [string, number][]).map(([key, value]) => (
                    <TraitRow key={key} label={key} value={value} />
                  ))}
                </div>
              </div>

              {/* Memory anchors */}
              {core.memoryAnchors.length > 0 && (
                <div
                  className="w-full rounded-[20px] p-4"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--ane-border)',
                  }}
                >
                  <p
                    className="text-[11px] uppercase tracking-wider mb-3"
                    style={{ color: 'var(--ane-muted)', fontFamily: 'var(--font-mono)' }}
                  >
                    Memory Anchors ({core.memoryAnchors.length})
                  </p>
                  <div className="space-y-2">
                    {core.memoryAnchors.slice(0, 3).map((anchor) => (
                      <div
                        key={anchor.id}
                        className="text-[13px] leading-relaxed"
                        style={{ color: 'rgba(255,255,255,0.65)' }}
                      >
                        · {anchor.summary}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Feed view: message history */
            <MessageFeed
              messages={ane.messages}
              entityDesignation={core.designation}
            />
          )}
        </div>

        {/* Input — always visible */}
        <div style={{ paddingBottom: safeBottom, flexShrink: 0 }}>
          <SyncInput
            onSend={ane.sendMessage}
            isProcessing={ane.isProcessing}
            disabled={false}
            placeholder={`Sync with ${core.designation}…`}
          />
        </div>
      </div>
    </KonstaApp>
  );
}

// ─── Trait Row ────────────────────────────────────────────────────────────────

function TraitRow({ label, value }: { label: string; value: number }) {
  const displayValue = typeof value === 'number' && value <= 100
    ? Math.round(value)
    : Math.round(value as number);

  const barColor =
    displayValue >= 90 ? 'var(--ane-accent)' :
    displayValue >= 70 ? '#34d399' :
    displayValue >= 50 ? '#fbbf24' :
    '#f87171';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span
          className="text-[11px] uppercase tracking-wider capitalize"
          style={{ color: 'var(--ane-muted)', fontFamily: 'var(--font-mono)' }}
        >
          {label}
        </span>
        <span
          className="text-[11px]"
          style={{ color: 'var(--ane-text)', fontFamily: 'var(--font-mono)' }}
        >
          {displayValue}
        </span>
      </div>
      <div
        className="h-[2px] rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.max(2, displayValue)}%`,
            background: barColor,
            borderRadius: 9999,
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
}
