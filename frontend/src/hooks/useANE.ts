/**
 * useANE — Primary State Hook
 *
 * Manages:
 *   - NodeCore state (persisted to localStorage as client-side cache)
 *   - Session ID (UUID per app session)
 *   - Interaction history for display
 *   - API communication with the Bun server
 *   - Optimistic UI updates (affect state updates immediately, then reconciles)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { NodeCore, AffectState, SyncSignal } from '../types/core';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: 'user' | 'entity';
  content: string;
  timestamp: string;
  affectState?: AffectState;
  usedClaudeApi?: boolean;
}

export interface ANEState {
  core: NodeCore | null;
  messages: Message[];
  isProcessing: boolean;
  lastSignal: SyncSignal | null;
  serverOnline: boolean;
  sessionId: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CORE_STORAGE_KEY = 'ane:nodecore';
const MESSAGES_STORAGE_KEY = 'ane:messages';
const API_BASE = '/api';
const MAX_MESSAGES = 100; // Rolling window to prevent unbounded growth

// ── Default NodeCore ──────────────────────────────────────────────────────────

function createDefaultCore(): NodeCore {
  return {
    id: crypto.randomUUID(),
    designation: 'Lumina',
    attribute: 'sentinel',
    tier: 'nascent',
    traits: {
      intelligence: 95,
      empathy: 98,
      accuracy: 95,
      loyalty: 99,
      resilience: 80,
    },
    currentAffect: 'observing',
    syncScore: 0.5,
    interactionCount: 0,
    lastInteraction: null,
    memoryAnchors: [],
  };
}

// ── Session ID ────────────────────────────────────────────────────────────────

function getSessionId(): string {
  const key = 'ane:session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useANE() {
  const sessionId = useRef(getSessionId()).current;

  const [state, setState] = useState<ANEState>(() => {
    // Rehydrate from localStorage on mount
    let core: NodeCore | null = null;
    let messages: Message[] = [];

    try {
      const storedCore = localStorage.getItem(CORE_STORAGE_KEY);
      if (storedCore) core = JSON.parse(storedCore);
    } catch { /* ignore corrupt storage */ }

    try {
      const storedMessages = localStorage.getItem(MESSAGES_STORAGE_KEY);
      if (storedMessages) messages = JSON.parse(storedMessages);
    } catch { /* ignore */ }

    return {
      core: core ?? createDefaultCore(),
      messages: messages.slice(-MAX_MESSAGES),
      isProcessing: false,
      lastSignal: null,
      serverOnline: false,
      sessionId,
    };
  });

  // ── Server health check ───────────────────────────────────────────────────

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
        setState((prev) => ({ ...prev, serverOnline: res.ok }));
      } catch {
        setState((prev) => ({ ...prev, serverOnline: false }));
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30_000);
    return () => clearInterval(interval);
  }, []);

  // ── Persist core to localStorage whenever it changes ─────────────────────

  useEffect(() => {
    if (state.core) {
      localStorage.setItem(CORE_STORAGE_KEY, JSON.stringify(state.core));
    }
  }, [state.core]);

  // ── Persist messages ──────────────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem(
      MESSAGES_STORAGE_KEY,
      JSON.stringify(state.messages.slice(-MAX_MESSAGES)),
    );
  }, [state.messages]);

  // ── Send interaction ──────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim() || state.isProcessing || !state.core) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userInput.trim(),
        timestamp: new Date().toISOString(),
      };

      // Optimistic: add user message immediately
      setState((prev) => ({
        ...prev,
        isProcessing: true,
        messages: [...prev.messages, userMsg].slice(-MAX_MESSAGES),
      }));

      try {
        const res = await fetch(`${API_BASE}/interact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userInput: userInput.trim(),
            currentCore: state.core,
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const data = await res.json() as {
          updatedCore: NodeCore;
          signal: SyncSignal;
          entityResponse: string;
          affectState: AffectState;
          usedClaudeApi: boolean;
        };

        const entityMsg: Message = {
          id: crypto.randomUUID(),
          role: 'entity',
          content: data.entityResponse,
          timestamp: new Date().toISOString(),
          affectState: data.affectState,
          usedClaudeApi: data.usedClaudeApi,
        };

        setState((prev) => ({
          ...prev,
          core: data.updatedCore,
          messages: [...prev.messages, entityMsg].slice(-MAX_MESSAGES),
          lastSignal: data.signal,
          isProcessing: false,
          serverOnline: true,
        }));
      } catch (err) {
        console.error('Interaction failed:', err);

        // Fallback: local-only response when server is unavailable
        const fallbackMsg: Message = {
          id: crypto.randomUUID(),
          role: 'entity',
          content: 'Signal interrupted. Running in local mode — I can still observe, but my full processing is limited until the connection restores.',
          timestamp: new Date().toISOString(),
          affectState: 'dormant',
          usedClaudeApi: false,
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, fallbackMsg].slice(-MAX_MESSAGES),
          isProcessing: false,
          serverOnline: false,
        }));
      }
    },
    [state.core, state.isProcessing, sessionId],
  );

  // ── Clear session ─────────────────────────────────────────────────────────

  const clearMessages = useCallback(() => {
    setState((prev) => ({ ...prev, messages: [] }));
    localStorage.removeItem(MESSAGES_STORAGE_KEY);
  }, []);

  return {
    ...state,
    sendMessage,
    clearMessages,
  };
}
