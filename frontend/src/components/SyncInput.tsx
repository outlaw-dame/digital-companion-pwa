/**
 * SyncInput — Tamer Interface Input
 *
 * The primary interaction surface. Designed to feel native on iOS:
 *   - Expanding textarea (grows with content, up to 5 lines)
 *   - Send on Enter (Shift+Enter for newline)
 *   - Send button appears only when there is content
 *   - Keyboard-aware layout (accounts for iOS virtual keyboard)
 *   - Haptic-style micro-feedback on send
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface SyncInputProps {
  onSend: (text: string) => void;
  isProcessing: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function SyncInput({
  onSend,
  isProcessing,
  disabled = false,
  placeholder = 'Sync your thoughts…',
}: SyncInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 24;
    const maxLines = 5;
    const maxHeight = lineHeight * maxLines + 32; // padding
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isProcessing || disabled) return;
    onSend(trimmed);
    setValue('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, isProcessing, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = value.trim().length > 0 && !isProcessing && !disabled;

  return (
    <div
      className="flex items-end gap-3 px-4 py-3"
      style={{
        background: 'rgba(20, 20, 31, 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid var(--ane-border)',
      }}
    >
      {/* Input container */}
      <div
        className="flex-1 flex items-end px-4 py-2 rounded-[22px]"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.10)',
          minHeight: 44,
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="ane-input"
          style={{
            maxHeight: 120,
            overflowY: 'auto',
            paddingTop: 10,
            paddingBottom: 10,
          }}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="on"
          autoCapitalize="sentences"
          spellCheck={true}
        />
      </div>

      {/* Send button — only visible when there is content */}
      <button
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          cursor: canSend ? 'pointer' : 'default',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: canSend ? 'var(--ane-accent)' : 'rgba(255,255,255,0.08)',
          transition: 'background 0.2s ease, transform 0.1s ease, opacity 0.2s ease',
          opacity: canSend ? 1 : 0.4,
          transform: canSend ? 'scale(1)' : 'scale(0.9)',
        }}
        onMouseDown={(e) => {
          if (canSend) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)';
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        {isProcessing ? (
          // Spinner
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{ animation: 'aura-spin-slow 1s linear infinite' }}
          >
            <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeDasharray="25 10" strokeLinecap="round" />
          </svg>
        ) : (
          // Arrow up
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 13V3M8 3L4 7M8 3L12 7"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
