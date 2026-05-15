/**
 * LinkPreviewCard
 *
 * Renders Open Graph metadata for a URL found in a user message.
 * Safe links: show title, description, image, domain with a clickable card.
 * Unsafe links: show a blocked warning — no clickable link.
 *
 * Design: compact card matching the app's dark aesthetic.
 */

import React, { useState } from 'react';
import type { LinkPreview } from '../types/core';
import { EMOJI } from './AppIcons';

interface LinkPreviewCardProps {
  preview: LinkPreview;
}

export function LinkPreviewCard({ preview }: LinkPreviewCardProps) {
  const [imgError, setImgError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  if (!preview.isSafe) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 10,
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          marginTop: 6,
        }}
      >
        <span style={{ fontSize: 14 }}>{EMOJI.warning}</span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(239,68,68,0.9)' }}>
            Link blocked — {preview.threatType ?? 'unsafe content'}
          </div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--ane-muted)',
              fontFamily: 'var(--font-mono)',
              marginTop: 2,
            }}
          >
            {preview.domain}
          </div>
        </div>
      </div>
    );
  }

  const hasContent = preview.title || preview.description;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        marginTop: 6,
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.07)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)';
      }}
    >
      {/* OG image */}
      {preview.imageUrl && !imgError && (
        <img
          src={preview.imageUrl}
          alt=""
          onError={() => setImgError(true)}
          style={{
            width: 56,
            height: 56,
            borderRadius: 8,
            objectFit: 'cover',
            flexShrink: 0,
            background: 'rgba(255,255,255,0.06)',
          }}
        />
      )}

      {/* Text content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Domain + favicon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {!faviconError ? (
            <img
              src={preview.favicon}
              alt=""
              width={12}
              height={12}
              onError={() => setFaviconError(true)}
              style={{ borderRadius: 2, flexShrink: 0 }}
            />
          ) : (
            <span style={{ fontSize: 10, opacity: 0.5 }}>{EMOJI.link}</span>
          )}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ane-muted)',
              textTransform: 'lowercase',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {preview.domain}
          </span>
        </div>

        {hasContent ? (
          <>
            {preview.title && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--ane-text)',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {preview.title}
              </div>
            )}
            {preview.description && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--ane-muted)',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {preview.description}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--ane-muted)' }}>
            {preview.url.length > 60 ? `${preview.url.slice(0, 57)}…` : preview.url}
          </div>
        )}
      </div>
    </a>
  );
}
