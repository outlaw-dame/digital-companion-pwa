/**
 * ProviderSelector — AI Backend Selection UI
 *
 * Displays all available providers with their status and lets the user
 * pin a preferred provider for their session.
 *
 * Layout:
 *   - Card per provider with availability indicator
 *   - Active provider highlighted
 *   - Cloudflare model sub-selector (dropdown) when CF is selected
 *   - Tooltips/descriptions for each option
 */

import React, { useEffect, useState } from 'react';
import type { ProviderName } from '../types/providers';
import { PROVIDER_META } from '../types/providers';

export interface ProviderStatus {
  name: ProviderName;
  label: string;
  modelId: string;
  isAvailable: boolean;
  isPrimary: boolean;
  description: string;
}

export interface CFModelOption {
  id: string;
  label: string;
  description: string;
  contextWindow: number;
  speed: 'fast' | 'medium' | 'slow';
  tier: 'free' | 'paid';
}

interface ProviderSelectorProps {
  currentProvider: ProviderName | null;
  onProviderChange: (provider: ProviderName, model?: string) => void;
}

export function ProviderSelector({ currentProvider, onProviderChange }: ProviderSelectorProps) {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [cfModels, setCfModels] = useState<CFModelOption[]>([]);
  const [selectedCFModel, setSelectedCFModel] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/providers').then((r) => r.json() as Promise<ProviderStatus[]>),
      fetch('/api/providers/models/cloudflare').then((r) => r.json() as Promise<CFModelOption[]>),
    ])
      .then(([ps, models]) => {
        setProviders(ps);
        setCfModels(models);
        if (models.length > 0) setSelectedCFModel(models[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-6"
        style={{ color: 'var(--ane-muted)' }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Loading providers…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p
        className="text-[11px] uppercase tracking-wider"
        style={{ color: 'var(--ane-muted)', fontFamily: 'var(--font-mono)' }}
      >
        Intelligence Backend
      </p>

      {providers.map((provider) => {
        const meta = PROVIDER_META[provider.name];
        const isSelected = currentProvider === provider.name ||
          (!currentProvider && provider.isPrimary);

        return (
          <ProviderCard
            key={provider.name}
            provider={provider}
            meta={meta}
            isSelected={isSelected}
            onSelect={() => {
              if (provider.name === 'cloudflare' && selectedCFModel) {
                onProviderChange(provider.name, selectedCFModel);
              } else {
                onProviderChange(provider.name);
              }
            }}
          >
            {/* Cloudflare model sub-selector */}
            {provider.name === 'cloudflare' && isSelected && cfModels.length > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p
                  className="text-[10px] uppercase tracking-wider mb-2"
                  style={{ color: 'var(--ane-muted)', fontFamily: 'var(--font-mono)' }}
                >
                  Model
                </p>
                <div className="flex flex-col gap-1">
                  {cfModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedCFModel(m.id);
                        onProviderChange('cloudflare', m.id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: `1px solid ${selectedCFModel === m.id ? 'rgba(124,107,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        background: selectedCFModel === m.id ? 'rgba(124,107,255,0.08)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--ane-text)', fontWeight: selectedCFModel === m.id ? 600 : 400 }}>
                          {m.label}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--ane-muted)', marginTop: 1 }}>
                          {m.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                        <SpeedBadge speed={m.speed} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </ProviderCard>
        );
      })}

      <p
        className="text-[11px] leading-relaxed"
        style={{ color: 'var(--ane-muted)' }}
      >
        The entity always processes locally first. External providers are only
        called when local confidence is below 75%.
      </p>
    </div>
  );
}

// ─── Provider Card ────────────────────────────────────────────────────────────

interface ProviderMeta {
  icon: string;
  color: string;
  privacyNote: string;
}

function ProviderCard({
  provider,
  meta,
  isSelected,
  onSelect,
  children,
}: {
  provider: ProviderStatus;
  meta: ProviderMeta;
  isSelected: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={!provider.isAvailable}
      style={{
        display: 'block',
        width: '100%',
        padding: '12px 14px',
        borderRadius: 14,
        border: `1px solid ${isSelected ? 'rgba(124,107,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
        background: isSelected ? 'rgba(124,107,255,0.08)' : 'rgba(255,255,255,0.03)',
        cursor: provider.isAvailable ? 'pointer' : 'not-allowed',
        opacity: provider.isAvailable ? 1 : 0.45,
        textAlign: 'left',
        transition: 'all 0.2s ease',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Provider icon */}
          <span style={{ fontSize: 20, lineHeight: 1 }}>{meta.icon}</span>

          <div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ane-text)' }}>
                {provider.label}
              </span>
              {provider.isPrimary && provider.isAvailable && (
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'rgba(52,211,153,0.9)',
                    background: 'rgba(52,211,153,0.1)',
                    padding: '1px 6px',
                    borderRadius: 4,
                  }}
                >
                  primary
                </span>
              )}
            </div>
            <p style={{ fontSize: 11, color: 'var(--ane-muted)', marginTop: 2 }}>
              {provider.description}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
              {meta.privacyNote}
            </p>
          </div>
        </div>

        {/* Status dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: provider.isAvailable ? '#34d399' : '#6b7280',
            boxShadow: provider.isAvailable ? '0 0 6px #34d399' : 'none',
            flexShrink: 0,
            marginTop: 4,
          }}
        />
      </div>

      {/* Model ID */}
      <div
        style={{
          marginTop: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'rgba(255,255,255,0.25)',
        }}
      >
        {provider.modelId}
      </div>

      {children}
    </button>
  );
}

function SpeedBadge({ speed }: { speed: 'fast' | 'medium' | 'slow' }) {
  const colors = {
    fast:   { bg: 'rgba(52,211,153,0.1)',  text: 'rgba(52,211,153,0.9)' },
    medium: { bg: 'rgba(251,191,36,0.1)',  text: 'rgba(251,191,36,0.9)' },
    slow:   { bg: 'rgba(156,163,175,0.1)', text: 'rgba(156,163,175,0.9)' },
  };
  const c = colors[speed];
  return (
    <span
      style={{
        fontSize: 9,
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: c.text,
        background: c.bg,
        padding: '2px 6px',
        borderRadius: 4,
      }}
    >
      {speed}
    </span>
  );
}
