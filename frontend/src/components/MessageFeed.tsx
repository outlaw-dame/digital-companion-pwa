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

import React, { useEffect, useRef } from 'react';
import type { Message } from '../hooks/useANE';
import type { AffectState } from '../types/core';
import { AFFECT_META } from '../types/core';

interface MessageFeedProps {
  messages: Message[];
  entityDesignation: string;
}

export function MessageFeed({ messages, entityDesignation }: MessageFeedProps) {
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
}: {
  message: Message;
  entityDesignation: string;
}) {
  const isUser = message.role === 'user';
  const ts = formatTimestamp(message.timestamp);

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in-up">
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
    );
  }

  // Entity message
  const affectMeta = message.affectState
    ? AFFECT_META[message.affectState as AffectState]
    : null;

  return (
    <div className="flex justify-start message-entity">
      <div className="flex flex-col gap-1 max-w-[80%]">

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
          {message.usedClaudeApi && (
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

        {/* Bubble */}
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
