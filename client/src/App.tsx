/**
 * App - Root Component (v2: Multi-Provider + Settings View)
 *
 * Three views:
 *   Entity   - AuraOrb + trait display + memory anchors
 *   Feed     - Message history
 *   Settings - Provider selector + entity config
 */

import React, { useCallback, useState } from 'react';
import { App as KonstaApp } from 'konsta/react';
import { usePlatform } from './hooks/usePlatform';
import { useANE } from './hooks/useANE';
import { useClientProvider } from './hooks/useClientProvider';
import { AuraOrb } from './components/AuraOrb';
import { MessageFeed } from './components/MessageFeed';
import { SyncInput } from './components/SyncInput';
import { GifKeyboard } from './components/GifKeyboard';
import { StatusBar } from './components/StatusBar';
import { ProviderSelector } from './components/ProviderSelector';
import { ClientProviderPanel } from './components/ClientProviderPanel';
import type { KlipyGif } from './types/klipy';
import { gifFullUrl, gifPreviewUrl, gifPreviewSize } from './types/klipy';
import type { GifAttachment } from './hooks/useANE';
import type { ProviderName } from './types/providers';
import './index.css';

type View = 'entity' | 'feed' | 'settings';

export default function App() {
  const platform = usePlatform();
  const ane = useANE();
  const clientProvider = useClientProvider();
  const [activeView, setActiveView] = useState<View>('entity');
  const [gifKeyboardOpen, setGifKeyboardOpen] = useState(false);

  const handleViewChange = (v: View) => {
    setActiveView(v);
    setGifKeyboardOpen(false); // close keyboard whenever the user navigates
  };

  // Route sends: client provider takes priority over server when loaded and ready
  const handleSend = useCallback(
    async (userInput: string) => {
      if (clientProvider.isClientProviderActive && clientProvider.isReady) {
        await ane.sendMessageViaClient(userInput, clientProvider.generateWithClient);
      } else {
        await ane.sendMessage(userInput);
      }
    },
    [
      ane,
      clientProvider.isClientProviderActive,
      clientProvider.isReady,
      clientProvider.generateWithClient,
    ],
  );

  const handleSendGif = useCallback(
    (gif: KlipyGif) => {
      setGifKeyboardOpen(false);
      const size = gifPreviewSize(gif);
      const attachment: GifAttachment = {
        slug: gif.slug,
        url: gifFullUrl(gif) ?? gifPreviewUrl(gif) ?? '',
        previewUrl: gifPreviewUrl(gif) ?? gifFullUrl(gif) ?? '',
        title: gif.title ?? '',
        width: size?.width ?? 0,
        height: size?.height ?? 0,
      };
      ane.sendGif(attachment);
      // Auto-switch to feed view so user sees the GIF land
      setActiveView('feed');
    },
    [ane],
  );

  const core = ane.core;
  if (!core) return null;

  const safeBottom = platform.safeAreas.bottom || 0;
  const safeTop = platform.safeAreas.top || 0;

  return (
    <KonstaApp
      theme={platform.theme}
      dark
      safeAreas={false}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
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
          preferredProvider={
            clientProvider.isClientProviderActive
              ? clientProvider.activeProvider
              : ane.preferredProvider
          }
        />

        {/* View toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 24px',
            borderBottom: '1px solid var(--ane-border)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              borderRadius: 10,
              padding: 3,
              background: 'rgba(255,255,255,0.06)',
              gap: 2,
            }}
          >
            {(['entity', 'feed', 'settings'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                style={{
                  padding: '6px 18px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: activeView === v ? 600 : 400,
                  color: activeView === v ? 'var(--ane-text)' : 'var(--ane-muted)',
                  background: activeView === v ? 'rgba(255,255,255,0.12)' : 'transparent',
                  transition: 'all 0.2s ease',
                  letterSpacing: '-0.01em',
                  textTransform: 'capitalize',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {activeView === 'entity' && (
            <div
              className="scroll-area"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 20,
                padding: '24px 20px',
              }}
            >
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
                style={{
                  width: '100%',
                  borderRadius: 20,
                  padding: '16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--ane-border)',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {(Object.entries(core.traits) as [string, number][]).map(([key, value]) => (
                    <TraitRow key={key} label={key} value={value} />
                  ))}
                </div>
              </div>

              {/* Memory anchors */}
              {core.memoryAnchors.length > 0 && (
                <div
                  style={{
                    width: '100%',
                    borderRadius: 20,
                    padding: '16px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--ane-border)',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--ane-muted)',
                      marginBottom: 10,
                    }}
                  >
                    Memory Anchors ({core.memoryAnchors.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {core.memoryAnchors.slice(0, 3).map((anchor) => (
                      <div
                        key={anchor.id}
                        style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}
                      >
                        · {anchor.summary}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeView === 'feed' && (
            <MessageFeed
              messages={ane.messages}
              entityDesignation={core.designation}
            />
          )}

          {activeView === 'settings' && (
            <div
              className="scroll-area"
              style={{ flex: 1, padding: '20px' }}
            >
              {/* On-device client providers (WebLLM, LiteRT) */}
              <ClientProviderPanel
                state={clientProvider}
                onSelect={clientProvider.selectClientProvider}
                onRelease={clientProvider.releaseClientProvider}
              />

              <div style={{ height: 1, background: 'var(--ane-border)', margin: '24px 0' }} />

              {/* Server-side providers (Claude, Cloudflare, Ollama) */}
              <ProviderSelector
                currentProvider={ane.preferredProvider}
                onProviderChange={(provider: ProviderName) => {
                  ane.setPreferredProvider(provider);
                }}
              />

              {/* Danger zone */}
              <div style={{ marginTop: 28 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--ane-muted)',
                    marginBottom: 12,
                  }}
                >
                  Session
                </p>
                <button
                  onClick={ane.clearMessages}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 14,
                    border: '1px solid rgba(239,68,68,0.2)',
                    background: 'rgba(239,68,68,0.05)',
                    color: 'rgba(239,68,68,0.8)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Clear message history
                </button>
              </div>
            </div>
          )}
        </div>

        {/* GIF Keyboard \u2014 slides in above the input */}
        {gifKeyboardOpen && (
          <GifKeyboard
            onSelect={handleSendGif}
            onClose={() => setGifKeyboardOpen(false)}
          />
        )}

        {/* Input */}
        <div style={{ paddingBottom: safeBottom, flexShrink: 0 }}>
          <SyncInput
            onSend={handleSend}
            isProcessing={ane.isProcessing || clientProvider.isInferring}
            placeholder={`Sync with ${core.designation}\u2026`}
            gifOpen={gifKeyboardOpen}
            onGifToggle={() => setGifKeyboardOpen((o) => !o)}
          />
        </div>
      </div>
    </KonstaApp>
  );
}

// Trait Row

function TraitRow({ label, value }: { label: string; value: number }) {
  const displayValue = Math.round(value as number);
  const barColor =
    displayValue >= 90 ? 'var(--ane-accent)' :
    displayValue >= 70 ? '#34d399' :
    displayValue >= 50 ? '#fbbf24' :
    '#f87171';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--ane-muted)',
          }}
        >
          {label}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ane-text)' }}>
          {displayValue}
        </span>
      </div>
      <div
        style={{
          height: 2,
          borderRadius: 999,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.max(2, displayValue)}%`,
            background: barColor,
            borderRadius: 999,
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
}
