/**
 * ClientProviderPanel
 *
 * Settings UI for WebLLM and LiteRT on-device providers.
 * Shows:
 *   - Browser capability status (WebGPU / WASM)
 *   - Model selection with size + speed info
 *   - Download progress bar during model initialization
 *   - Active provider status and release button
 *   - Clear warnings about download size
 */

import React, { useState } from 'react';
import type { ClientProviderCapability, ClientProviderState } from '../hooks/useClientProvider';
import type { ClientModelOption } from '../engine/providers/clientInterface';

interface ClientProviderPanelProps {
  state: ClientProviderState;
  onSelect: (
    provider: 'webllm' | 'litert',
    modelId: string,
    modelUrl?: string,
  ) => Promise<void>;
  onRelease: () => void;
}

export function ClientProviderPanel({
  state,
  onSelect,
  onRelease,
}: ClientProviderPanelProps) {
  const [selectedModel, setSelectedModel] = useState<Record<string, string>>({});
  const [liteRTModelUrl, setLiteRTModelUrl] = useState('');
  const [loading, setLoading] = useState(false);

  if (!state.capabilityCheckDone) {
    return (
      <div style={{ color: 'var(--ane-muted)', fontSize: 12, padding: '8px 0' }}>
        Checking browser capabilities…
      </div>
    );
  }

  const handleLoad = async (cap: ClientProviderCapability) => {
    const modelId = selectedModel[cap.name] ?? cap.models[0]?.id;
    if (!modelId) return;

    const modelUrl = cap.name === 'litert' ? liteRTModelUrl : undefined;
    if (cap.name === 'litert' && !modelUrl) return;

    setLoading(true);
    try {
      await onSelect(cap.name, modelId, modelUrl);
    } catch {
      // Error is shown via state.downloadProgress
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--ane-muted)',
        }}
      >
        On-Device Intelligence
      </p>

      {/* Active client provider banner */}
      {state.activeProvider && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 14,
            background: 'rgba(52,211,153,0.06)',
            border: '1px solid rgba(52,211,153,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#34d399' }}>
              {state.activeProvider === 'webllm' ? 'WebLLM' : 'LiteRT'} active
            </div>
            <div style={{ fontSize: 11, color: 'var(--ane-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
              {state.activeModelId}
            </div>
          </div>
          <button
            onClick={onRelease}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.06)',
              color: 'rgba(239,68,68,0.8)',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Release
          </button>
        </div>
      )}

      {/* Download progress */}
      {state.downloadProgress && state.downloadProgress.status !== 'ready' && (
        <DownloadProgressBar progress={state.downloadProgress} />
      )}

      {/* Provider cards */}
      {state.capabilities.map((cap) => (
        <ClientProviderCard
          key={cap.name}
          cap={cap}
          selectedModel={selectedModel[cap.name] ?? cap.models[0]?.id ?? ''}
          onModelChange={(id) => setSelectedModel((prev) => ({ ...prev, [cap.name]: id }))}
          liteRTModelUrl={liteRTModelUrl}
          onLiteRTUrlChange={setLiteRTModelUrl}
          isActive={state.activeProvider === cap.name}
          isLoading={loading && state.downloadProgress?.status !== 'ready'}
          onLoad={() => handleLoad(cap)}
        />
      ))}

      <p style={{ fontSize: 11, color: 'var(--ane-muted)', lineHeight: 1.5 }}>
        On-device models run entirely in your browser — no API keys, no server calls, no data leaves your device. First load downloads the model (1–5 GB) to your browser cache.
      </p>
    </div>
  );
}

// ── Download Progress Bar ───────────────────────────────────────────────────

function DownloadProgressBar({
  progress,
}: {
  progress: { status: string; progress: number; message: string; error?: string };
}) {
  const isError = progress.status === 'error';

  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 14,
        background: isError ? 'rgba(239,68,68,0.06)' : 'rgba(124,107,255,0.06)',
        border: `1px solid ${isError ? 'rgba(239,68,68,0.2)' : 'rgba(124,107,255,0.15)'}`,
      }}
    >
      <div style={{ fontSize: 13, color: isError ? '#f87171' : 'var(--ane-text)', marginBottom: 8 }}>
        {progress.message}
      </div>
      {!isError && (
        <div
          style={{
            height: 3,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.max(2, progress.progress * 100)}%`,
              background: 'linear-gradient(90deg, var(--ane-accent), rgba(124,107,255,0.6))',
              borderRadius: 999,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      )}
      {isError && progress.error && (
        <div style={{ fontSize: 11, color: 'rgba(239,68,68,0.7)', marginTop: 4 }}>
          {progress.error}
        </div>
      )}
    </div>
  );
}

// ── Provider Card ───────────────────────────────────────────────────────────

function ClientProviderCard({
  cap,
  selectedModel,
  onModelChange,
  liteRTModelUrl,
  onLiteRTUrlChange,
  isActive,
  isLoading,
  onLoad,
}: {
  cap: ClientProviderCapability;
  selectedModel: string;
  onModelChange: (id: string) => void;
  liteRTModelUrl: string;
  onLiteRTUrlChange: (url: string) => void;
  isActive: boolean;
  isLoading: boolean;
  onLoad: () => void;
}) {
  const model = cap.models.find((m) => m.id === selectedModel) ?? cap.models[0];

  return (
    <div
      style={{
        padding: '14px',
        borderRadius: 16,
        border: `1px solid ${isActive ? 'rgba(52,211,153,0.3)' : cap.isSupported ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
        background: isActive ? 'rgba(52,211,153,0.04)' : 'rgba(255,255,255,0.03)',
        opacity: cap.isSupported ? 1 : 0.5,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ane-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {cap.label}
            <CapabilityBadge isSupported={cap.isSupported} requiresWebGPU={cap.requiresWebGPU} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--ane-muted)', marginTop: 2 }}>
            {cap.description}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
            {cap.privacyNote}
          </div>
        </div>
      </div>

      {cap.isSupported && (
        <>
          {/* Model selector */}
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: 'var(--ane-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Model
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {cap.models.map((m) => (
                <ModelRow
                  key={m.id}
                  model={m}
                  isSelected={selectedModel === m.id}
                  onSelect={() => onModelChange(m.id)}
                />
              ))}
            </div>
          </div>

          {/* LiteRT: model URL input */}
          {cap.name === 'litert' && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: 'var(--ane-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                Model URL / Path
              </p>
              <input
                type="text"
                value={liteRTModelUrl}
                onChange={(e) => onLiteRTUrlChange(e.target.value)}
                placeholder="/models/gemma-3n-E2B-it-int4-Web.litertlm"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--ane-text)',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
              <p style={{ fontSize: 10, color: 'var(--ane-muted)', marginTop: 4 }}>
                Download .litertlm from{' '}
                <a
                  href="https://huggingface.co/collections/google/gemma-3n-6851fb3f99cb2cc8a7d3d5ee"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--ane-accent)' }}
                >
                  HuggingFace
                </a>{' '}
                and place in <code style={{ fontFamily: 'var(--font-mono)' }}>public/models/</code>
              </p>
            </div>
          )}

          {/* Download size warning + load button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {model && (
              <span style={{ fontSize: 11, color: 'var(--ane-muted)' }}>
                ~{model.sizeGb} GB download
              </span>
            )}
            <button
              onClick={onLoad}
              disabled={isLoading || isActive || (cap.name === 'litert' && !liteRTModelUrl)}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: 'none',
                background: isActive ? 'rgba(52,211,153,0.15)' : 'var(--ane-accent)',
                color: isActive ? '#34d399' : 'white',
                fontSize: 13,
                fontWeight: 600,
                cursor: isLoading || isActive ? 'default' : 'pointer',
                opacity: isLoading || (cap.name === 'litert' && !liteRTModelUrl) ? 0.5 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              {isActive ? 'Loaded' : isLoading ? 'Loading…' : 'Load Model'}
            </button>
          </div>
        </>
      )}

      {!cap.isSupported && (
        <p style={{ fontSize: 12, color: 'rgba(239,68,68,0.7)', marginTop: 4 }}>
          {cap.requiresWebGPU
            ? 'WebGPU not available. Use Chrome 113+ or Edge 113+ on a device with a compatible GPU.'
            : 'WebAssembly not available in this browser.'}
        </p>
      )}
    </div>
  );
}

// ── Model Row ───────────────────────────────────────────────────────────────

function ModelRow({ model, isSelected, onSelect }: {
  model: ClientModelOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const speedColors = {
    fast:   'rgba(52,211,153,0.8)',
    medium: 'rgba(251,191,36,0.8)',
    slow:   'rgba(156,163,175,0.8)',
  };

  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 10px',
        borderRadius: 8,
        border: `1px solid ${isSelected ? 'rgba(124,107,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
        background: isSelected ? 'rgba(124,107,255,0.08)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s ease',
        width: '100%',
      }}
    >
      <div>
        <div style={{ fontSize: 12, color: 'var(--ane-text)', fontWeight: isSelected ? 600 : 400 }}>
          {model.label}
        </div>
        <div style={{ fontSize: 10, color: 'var(--ane-muted)', marginTop: 1 }}>
          {model.description}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--ane-muted)', fontFamily: 'var(--font-mono)' }}>
          {model.sizeGb}GB
        </span>
        <span
          style={{
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: speedColors[model.speed],
            background: `${speedColors[model.speed].replace('0.8', '0.1')}`,
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          {model.speed}
        </span>
      </div>
    </button>
  );
}

// ── Capability Badge ────────────────────────────────────────────────────────

function CapabilityBadge({ isSupported, requiresWebGPU }: {
  isSupported: boolean;
  requiresWebGPU: boolean;
}) {
  return (
    <span
      style={{
        fontSize: 9,
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: isSupported ? 'rgba(52,211,153,0.9)' : 'rgba(239,68,68,0.7)',
        background: isSupported ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.08)',
        padding: '2px 6px',
        borderRadius: 4,
      }}
    >
      {isSupported ? (requiresWebGPU ? 'WebGPU ✓' : 'WASM ✓') : 'Not supported'}
    </span>
  );
}
