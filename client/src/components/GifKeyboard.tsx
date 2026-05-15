/**
 * GifKeyboard
 *
 * Slides up above the chat input, like a native GIF keyboard.
 * Shows trending GIFs by default; switches to search results while typing.
 * Tapping a GIF fires onSelect and closes the panel.
 */

import React, { useRef, useEffect } from 'react';
import type { KlipyGif } from '../types/klipy';
import { gifPreviewUrl, gifPreviewSize } from '../types/klipy';
import { useGifSearch } from '../hooks/useGifSearch';
import { SearchIcon, CloseIcon } from './AppIcons';

interface GifKeyboardProps {
  onSelect: (gif: KlipyGif) => void;
  onClose: () => void;
}

export function GifKeyboard({ onSelect, onClose }: GifKeyboardProps) {
  const { query, setQuery, state, loadMore, gifAvailable } = useGifSearch();
  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Infinite scroll — load more when user reaches the bottom of the grid.
  // Throttled via requestAnimationFrame to avoid firing on every pixel.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) loadMore();
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [loadMore]);

  if (!gifAvailable) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <CloseButton onClose={onClose} />
        </div>
        <div style={centerStyle}>
          <span style={{ fontSize: 13, color: 'var(--ane-muted)' }}>
            GIF service not configured — add{' '}
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>KLIPY_API_KEY</code>{' '}
            to server .env
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Header: search + close */}
      <div style={headerStyle}>
        <div style={searchWrapStyle}>
          <GifSearchIcon />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs…"
            style={searchInputStyle}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={clearBtnStyle}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <CloseButton onClose={onClose} />
      </div>

      {/* Section label */}
      <div style={labelStyle}>
        {query ? `Results for "${query}"` : 'Trending'}
      </div>

      {/* GIF grid */}
      <div ref={gridRef} style={gridContainerStyle}>
        {state.error && (
          <div style={centerStyle}>
            <span style={{ fontSize: 13, color: 'rgba(239,68,68,0.7)' }}>{state.error}</span>
          </div>
        )}

        {!state.error && state.gifs.length === 0 && !state.isLoading && (
          <div style={centerStyle}>
            <span style={{ fontSize: 13, color: 'var(--ane-muted)' }}>
              {query ? 'No results' : 'No GIFs available'}
            </span>
          </div>
        )}

        <div style={gridStyle}>
          {state.gifs.map((gif) => (
            <GifTile key={gif.slug} gif={gif} onSelect={onSelect} />
          ))}
          {/* Skeleton tiles while loading */}
          {state.isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={`sk-${i}`} style={skeletonStyle} />
            ))}
        </div>
      </div>

      {/* Powered-by attribution (Klipy API usage guidelines require this) */}
      <div style={attributionStyle}>
        Powered by KLIPY
      </div>
    </div>
  );
}

// ─── GIF Tile ─────────────────────────────────────────────────────────────────

function GifTile({ gif, onSelect }: { gif: KlipyGif; onSelect: (g: KlipyGif) => void }) {
  const url = gifPreviewUrl(gif);
  const size = gifPreviewSize(gif);
  const aspectPadding = size
    ? `${((size.height / size.width) * 100).toFixed(1)}%`
    : '75%';

  if (!url) return null;

  return (
    <button
      onClick={() => onSelect(gif)}
      style={{
        padding: 0,
        border: 'none',
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'rgba(255,255,255,0.06)',
        position: 'relative',
        width: '100%',
        display: 'block',
      }}
      title={gif.title || undefined}
    >
      {/* Aspect-ratio placeholder */}
      <div style={{ paddingBottom: aspectPadding, position: 'relative' }}>
        <img
          src={url}
          alt={gif.title || 'GIF'}
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
    </button>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} style={closeBtnStyle} aria-label="Close GIF keyboard">
      <CloseIcon size={14} color="currentColor" />
    </button>
  );
}

function GifSearchIcon() {
  return (
    <SearchIcon
      size={14}
      color="var(--ane-muted)"
      style={{ flexShrink: 0 }}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: 310,
  background: 'rgba(18, 18, 28, 0.96)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderTop: '1px solid rgba(255,255,255,0.08)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px 8px',
  flexShrink: 0,
};

const searchWrapStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '7px 10px',
  border: '1px solid rgba(255,255,255,0.08)',
};

const searchInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: 'var(--ane-text)',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
};

const clearBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--ane-muted)',
  cursor: 'pointer',
  fontSize: 18,
  lineHeight: 1,
  padding: '0 2px',
  flexShrink: 0,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 8,
  color: 'var(--ane-muted)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
  padding: '0 12px 6px',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--ane-muted)',
  flexShrink: 0,
};

const gridContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '0 8px',
  WebkitOverflowScrolling: 'touch',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 4,
  paddingBottom: 8,
};

const skeletonStyle: React.CSSProperties = {
  borderRadius: 10,
  background: 'rgba(255,255,255,0.05)',
  paddingBottom: '75%',
  animation: 'aura-breathe 1.5s ease-in-out infinite',
};

const centerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 160,
};

const attributionStyle: React.CSSProperties = {
  padding: '4px 12px',
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
  color: 'rgba(255,255,255,0.2)',
  textAlign: 'center',
  flexShrink: 0,
};
