/**
 * MessageFeed — Conversation Display
 *
 * Renders the rolling message history with:
 *   - User messages right-aligned (iOS iMessage style)
 *   - Entity messages left-aligned with affect state indicator
 *   - Claude API badge for escalated responses
 *   - Auto-scroll to latest message
 *   - Timestamp formatting (relative for recent, absolute for older)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Message } from '../hooks/useANE';
import type { AffectState } from '../types/core';
import { AFFECT_META } from '../types/core';
import { LinkPreviewCard } from './LinkPreviewCard';

interface MessageFeedProps {
  messages: Message[];
  entityDesignation: string;
  onDeleteMessage: (messageId: string) => Promise<{ deleted: boolean; safetyMessage?: string }>;
  onReplyMessage: (message: Message) => void;
}

export function MessageFeed({ messages, entityDesignation, onDeleteMessage, onReplyMessage }: MessageFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ color: 'var(--ane-muted)' }}
      >
        <p className="text-center text-[14px] leading-relaxed" style={{ maxWidth: 260 }}>
          Begin by sharing what's on your mind. {entityDesignation} is observing.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 scroll-area px-4 py-2 space-y-3">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          entityDesignation={entityDesignation}
          onDelete={onDeleteMessage}
          onReply={onReplyMessage}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── Individual Bubble ────────────────────────────────────────────────────────

function MessageBubble({
  message,
  entityDesignation,
  onDelete,
  onReply,
}: {
  message: Message;
  entityDesignation: string;
  onDelete: (id: string) => Promise<{ deleted: boolean; safetyMessage?: string }>;
  onReply: (msg: Message) => void;
}) {
  const isUser = message.role === 'user';
  const ts = formatTimestamp(message.timestamp);
  const [hovered, setHovered] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [safetyMsg, setSafetyMsg] = useState<string | null>(null);

  const canDelete = Boolean(message.observationId);
  const canReply  = Boolean(message.observationId);

  const handleDelete = useCallback(async () => {
    if (!canDelete || deleting) return;
    setDeleting(true);
    setSafetyMsg(null);
    const result = await onDelete(message.id);
    if (!result.deleted) {
      setDeleting(false);
      if (result.safetyMessage) setSafetyMsg(result.safetyMessage);
    }
    // If deleted, this component is unmounted — no state update needed
  }, [canDelete, deleting, message.id, onDelete]);

  if (isUser) {
    const isGifOnly = Boolean(message.gifAttachment) && message.content.startsWith('[GIF');

    return (
      <div
        className="flex flex-col items-end gap-1 animate-fade-in-up"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setSafetyMsg(null); }}
      >
        {/* Thread indicator — shown when this is a reply */}
        {message.parentObservationId != null && (
          <ThreadIndicator align="right" />
        )}

        {/* GIF attachment */}
        {message.gifAttachment && (
          <GifBubble gif={message.gifAttachment} align="right" ts={ts} />
        )}

        {/* Text bubble */}
        {!isGifOnly && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            {/* Action buttons — appear on hover, left of the bubble */}
            {hovered && (
              <div style={{ display: 'flex', gap: 4 }}>
                {canReply && <ReplyButton onClick={() => onReply(message)} />}
                {canDelete && <DeleteButton deleting={deleting} onClick={handleDelete} />}
              </div>
            )}
            <div
              className="max-w-[75%] px-4 py-3 rounded-[20px] rounded-tr-[6px]"
              style={{
                background: 'var(--ane-accent)',
                color: 'white',
                fontSize: 15,
                lineHeight: 1.45,
              }}
            >
              {message.content}
              <div
                className="mt-1 text-right text-[10px]"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {ts}
              </div>
            </div>
          </div>
        )}

        {/* Link previews */}
        {message.linkPreviews && message.linkPreviews.length > 0 && (
          <div style={{ width: '75%', display: 'flex', flexDirection: 'column' }}>
            {message.linkPreviews.map((p) => (
              <LinkPreviewCard key={p.url} preview={p} />
            ))}
          </div>
        )}

        {/* Safety hold message */}
        {safetyMsg && <SafetyNotice message={safetyMsg} />}
      </div>
    );
  }

  // Entity message
  const affectMeta = message.affectState
    ? AFFECT_META[message.affectState as AffectState]
    : null;

  return (
    <div
      className="flex justify-start message-entity"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setSafetyMsg(null); }}
    >
      <div className="flex flex-col gap-1 max-w-[80%]">

        {/* Thread indicator — shown when this is a reply */}
        {message.parentObservationId != null && (
          <ThreadIndicator align="left" />
        )}

        {/* Entity label + affect indicator */}
        <div className="flex items-center gap-2 pl-1">
          <span
            className="text-[10px] tracking-[0.15em] uppercase"
            style={{ color: 'var(--ane-muted)', fontFamily: 'var(--font-mono)' }}
          >
            {entityDesignation}
          </span>
          {affectMeta && (
            <span
              className="text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded-full"
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {affectMeta.label}
            </span>
          )}
          {message.usedExternalApi && (
            <span
              className="text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded-full"
              style={{
                color: 'rgba(124, 107, 255, 0.8)',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(124, 107, 255, 0.08)',
                border: '1px solid rgba(124, 107, 255, 0.15)',
              }}
            >
              Deep
            </span>
          )}
        </div>

        {/* Bubble + action buttons */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
          <div
            className="px-4 py-3 rounded-[20px] rounded-tl-[6px]"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--ane-text)',
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            {message.content}
            <div
              className="mt-1 text-[10px]"
              style={{ color: 'var(--ane-muted)' }}
            >
              {ts}
            </div>
          </div>
          {/* Action buttons — appear on hover, right of the entity bubble */}
          {hovered && (
            <div style={{ display: 'flex', gap: 4 }}>
              {canReply && <ReplyButton onClick={() => onReply(message)} />}
              {canDelete && <DeleteButton deleting={deleting} onClick={handleDelete} />}
            </div>
          )}
        </div>

        {/* Safety hold message */}
        {safetyMsg && <SafetyNotice message={safetyMsg} />}
      </div>
    </div>
  );
}

// ─── Thread Indicator ─────────────────────────────────────────────────────────

function ThreadIndicator({ align }: { align: 'left' | 'right' }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        paddingLeft: align === 'left' ? 12 : 0,
        paddingRight: align === 'right' ? 12 : 0,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d="M1 1 L1 6 Q1 9 4 9 L9 9"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)' }}>
        reply
      </span>
    </div>
  );
}

// ─── Reply Button ─────────────────────────────────────────────────────────────

function ReplyButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Reply in thread"
      aria-label="Reply in thread"
      style={{
        flexShrink: 0,
        width: 26,
        height: 26,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.35)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'color 0.15s ease, background 0.15s ease',
        padding: 0,
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'rgba(124,107,255,0.9)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)';
      }}
    >
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path
          d="M1 5 L6 1 L6 3.5 C9 3.5 10 5.5 10 8 C9 6.5 7.5 5.5 6 5.5 L6 8 Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}

// ─── Delete Button ────────────────────────────────────────────────────────────

function DeleteButton({ deleting, onClick }: { deleting: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={deleting}
      title="Delete this exchange"
      aria-label="Delete this exchange"
      style={{
        flexShrink: 0,
        width: 26,
        height: 26,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.04)',
        color: deleting ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.35)',
        cursor: deleting ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'color 0.15s ease, background 0.15s ease',
        padding: 0,
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        if (!deleting) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,80,80,0.8)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = deleting
          ? 'rgba(255,255,255,0.2)'
          : 'rgba(255,255,255,0.35)';
      }}
    >
      {deleting ? (
        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}>…</span>
      ) : (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M1 1L10 10M10 1L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
}

// ─── Safety Notice ────────────────────────────────────────────────────────────

function SafetyNotice({ message }: { message: string }) {
  return (
    <div
      style={{
        maxWidth: '75%',
        padding: '8px 12px',
        borderRadius: 10,
        background: 'rgba(255,200,100,0.08)',
        border: '1px solid rgba(255,200,100,0.15)',
        color: 'rgba(255,220,140,0.9)',
        fontSize: 12,
        lineHeight: 1.45,
      }}
    >
      {message}
    </div>
  );
}

// ─── GIF Bubble ───────────────────────────────────────────────────────────────

function GifBubble({
  gif,
  align,
  ts,
}: {
  gif: NonNullable<Message['gifAttachment']>;
  align: 'left' | 'right';
  ts: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const displayUrl = gif.url || gif.previewUrl;
  const aspectPadding = gif.height && gif.width
    ? `${((gif.height / gif.width) * 100).toFixed(1)}%`
    : '75%';

  return (
    <div
      style={{
        maxWidth: '65%',
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ paddingBottom: aspectPadding, position: 'relative' }}>
        {!loaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.04)',
              animation: 'aura-breathe 1.5s ease-in-out infinite',
            }}
          />
        )}
        <img
          src={displayUrl}
          alt={gif.title || 'GIF'}
          onLoad={() => setLoaded(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
      </div>
      {/* Timestamp overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 6,
          right: align === 'right' ? 8 : undefined,
          left: align === 'left' ? 8 : undefined,
          fontSize: 10,
          color: 'rgba(255,255,255,0.6)',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        }}
      >
        {ts}
      </div>
    </div>
  );
}

// ─── Timestamp formatting ─────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
