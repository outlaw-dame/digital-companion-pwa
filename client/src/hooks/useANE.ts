/**
 * useANE - Primary State Hook (v2: Multi-Provider)
 *
 * Manages:
 *   - NodeCore state (persisted to localStorage as client-side cache)
 *   - Session ID (UUID per app session)
 *   - Interaction history for display
 *   - API communication with the Bun server
 *   - Preferred AI provider selection
 *   - Optimistic UI updates
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { NodeCore, AffectState, SyncSignal, LinkPreview } from '../types/core';
import type { ProviderName } from '../types/providers';
import type { ClientEscalationResult } from '../engine/providers/clientInterface';

// Types

export interface GifAttachment {
  slug: string;
  url: string;        // full-quality gif URL for display
  previewUrl: string; // tiny/webp for thumbnails
  title: string;
  width: number;
  height: number;
}

export interface Message {
  id: string;
  role: 'user' | 'entity';
  content: string;
  timestamp: string;
  affectState?: AffectState;
  usedExternalApi?: boolean;
  providerUsed?: ProviderName;
  modelUsed?: string;
  linkPreviews?: LinkPreview[];  // Populated on user messages that contained URLs
  gifAttachment?: GifAttachment; // Populated when user sends a GIF
}

export interface ANEState {
  core: NodeCore | null;
  messages: Message[];
  isProcessing: boolean;
  lastSignal: SyncSignal | null;
  serverOnline: boolean;
  sessionId: string;
  preferredProvider: ProviderName | null;
}

// Constants

const CORE_STORAGE_KEY = 'ane:nodecore';
const MESSAGES_STORAGE_KEY = 'ane:messages';
const PROVIDER_STORAGE_KEY = 'ane:preferredProvider';
const API_BASE = '/api';
const MAX_MESSAGES = 100;
const HISTORY_WINDOW = 10;    // last N messages sent to server (5 exchanges)
const HISTORY_CONTENT_CAP = 500; // max chars per historical message

// Default NodeCore

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

// Session ID

function getSessionId(): string {
  const key = 'ane:session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

// Hook

export function useANE() {
  const sessionId = useRef(getSessionId()).current;

  const [state, setState] = useState<ANEState>(() => {
    let core: NodeCore | null = null;
    let messages: Message[] = [];
    let preferredProvider: ProviderName | null = null;

    try {
      const storedCore = localStorage.getItem(CORE_STORAGE_KEY);
      if (storedCore) core = JSON.parse(storedCore);
    } catch { /* ignore */ }

    try {
      const storedMessages = localStorage.getItem(MESSAGES_STORAGE_KEY);
      if (storedMessages) messages = JSON.parse(storedMessages);
    } catch { /* ignore */ }

    try {
      const stored = localStorage.getItem(PROVIDER_STORAGE_KEY);
      if (stored) preferredProvider = stored as ProviderName;
    } catch { /* ignore */ }

    return {
      core: core ?? createDefaultCore(),
      messages: messages.slice(-MAX_MESSAGES),
      isProcessing: false,
      lastSignal: null,
      serverOnline: false,
      sessionId,
      preferredProvider,
    };
  });

  // Server health check

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

  // Persist core

  useEffect(() => {
    if (state.core) {
      localStorage.setItem(CORE_STORAGE_KEY, JSON.stringify(state.core));
    }
  }, [state.core]);

  // Persist messages — strip rich attachments to avoid storing media URLs in localStorage
  useEffect(() => {
    const toStore = state.messages.slice(-MAX_MESSAGES).map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ linkPreviews: _lp, gifAttachment: _ga, ...rest }) => rest,
    );
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(toStore));
  }, [state.messages]);

  // Send interaction

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim() || state.isProcessing || !state.core) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userInput.trim(),
        timestamp: new Date().toISOString(),
      };

      // Capture history before the optimistic setState adds the current message.
      const conversationHistory = extractHistory(state.messages);

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
            preferredProvider: state.preferredProvider ?? undefined,
            conversationHistory,
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
          providerUsed?: ProviderName;
          modelUsed?: string;
          linkPreviews?: LinkPreview[];
        };

        // Attach link previews to the user message (they came from user's input)
        const userMsgWithPreviews: Message = {
          ...userMsg,
          linkPreviews: data.linkPreviews?.length ? data.linkPreviews : undefined,
        };

        const entityMsg: Message = {
          id: crypto.randomUUID(),
          role: 'entity',
          content: data.entityResponse,
          timestamp: new Date().toISOString(),
          affectState: data.affectState,
          usedExternalApi: data.usedClaudeApi,
          providerUsed: data.providerUsed,
          modelUsed: data.modelUsed,
        };

        setState((prev) => {
          // Replace the optimistic user message with the one carrying link previews
          const msgs = prev.messages.map((m) =>
            m.id === userMsg.id ? userMsgWithPreviews : m,
          );
          return {
            ...prev,
            core: data.updatedCore,
            messages: [...msgs, entityMsg].slice(-MAX_MESSAGES),
            lastSignal: data.signal,
            isProcessing: false,
            serverOnline: true,
          };
        });
      } catch (err) {
        console.error('Interaction failed:', err);

        const fallbackMsg: Message = {
          id: crypto.randomUUID(),
          role: 'entity',
          content: 'Signal interrupted. Running in local mode — my full processing is limited until the connection restores.',
          timestamp: new Date().toISOString(),
          affectState: 'dormant',
          usedExternalApi: false,
          providerUsed: 'local',
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, fallbackMsg].slice(-MAX_MESSAGES),
          isProcessing: false,
          serverOnline: false,
        }));
      }
    },
    [state.core, state.isProcessing, state.preferredProvider, sessionId],
  );

  // Client-side inference path — bypasses server entirely.
  // NodeCore is updated locally (resilience, syncScore, tier, affect).
  const sendMessageViaClient = useCallback(
    async (
      userInput: string,
      generateFn: (system: string, user: string) => Promise<ClientEscalationResult | null>,
    ) => {
      if (!userInput.trim() || state.isProcessing || !state.core) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userInput.trim(),
        timestamp: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        isProcessing: true,
        messages: [...prev.messages, userMsg].slice(-MAX_MESSAGES),
      }));

      try {
        const systemPrompt = buildClientSystemPrompt(state.core);
        const userPrompt = `USER INPUT: "${userInput.trim()}"\n\nProvide your analysis and response.`;
        const result = await generateFn(systemPrompt, userPrompt);
        if (!result) throw new Error('Client provider returned no result');

        const newResilience = Math.min(100, state.core.traits.resilience + 2);
        const newSyncScore = Math.min(1, state.core.syncScore + (result.shouldCreateAnchor ? 0.02 : 0.005));
        const newCount = state.core.interactionCount + 1;
        const newAffect = result.refinedAffect ?? state.core.currentAffect;

        const updatedCore: NodeCore = {
          ...state.core,
          traits: { ...state.core.traits, resilience: newResilience },
          currentAffect: newAffect,
          syncScore: newSyncScore,
          interactionCount: newCount,
          lastInteraction: new Date().toISOString(),
          tier: checkClientTier(newCount, newSyncScore),
        };

        const entityMsg: Message = {
          id: crypto.randomUUID(),
          role: 'entity',
          content: result.entityResponse,
          timestamp: new Date().toISOString(),
          affectState: result.refinedAffect,
          usedExternalApi: true,
          providerUsed: result.providerUsed,
          modelUsed: result.modelUsed,
        };

        setState((prev) => ({
          ...prev,
          core: updatedCore,
          messages: [...prev.messages, entityMsg].slice(-MAX_MESSAGES),
          isProcessing: false,
        }));
      } catch (err) {
        console.error('Client inference failed:', err);

        const fallbackMsg: Message = {
          id: crypto.randomUUID(),
          role: 'entity',
          content: 'On-device inference encountered an error. Check model status in Settings.',
          timestamp: new Date().toISOString(),
          affectState: 'dormant',
          usedExternalApi: false,
          providerUsed: 'local',
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, fallbackMsg].slice(-MAX_MESSAGES),
          isProcessing: false,
        }));
      }
    },
    [state.core, state.isProcessing],
  );

  // Send GIF — creates a user message with gif attachment and elicits entity response

  const sendGif = useCallback(async (gif: GifAttachment) => {
    if (state.isProcessing || !state.core) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: gif.title ? `[GIF: ${gif.title}]` : '[GIF]',
      timestamp: new Date().toISOString(),
      gifAttachment: gif,
    };

    const conversationHistory = extractHistory(state.messages);

    setState((prev) => ({
      ...prev,
      isProcessing: true,
      messages: [...prev.messages, userMsg].slice(-MAX_MESSAGES),
    }));

    // Fire share trigger (Klipy API usage requirement — fire-and-forget)
    fetch(`/api/media/gifs/${encodeURIComponent(gif.slug)}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).catch(() => {});

    try {
      const res = await fetch(`${API_BASE}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userInput: buildGifContext(gif.title),
          currentCore: state.core,
          preferredProvider: state.preferredProvider ?? undefined,
          conversationHistory,
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
        providerUsed?: ProviderName;
        modelUsed?: string;
      };

      const entityMsg: Message = {
        id: crypto.randomUUID(),
        role: 'entity',
        content: data.entityResponse,
        timestamp: new Date().toISOString(),
        affectState: data.affectState,
        usedExternalApi: data.usedClaudeApi,
        providerUsed: data.providerUsed,
        modelUsed: data.modelUsed,
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
      console.error('GIF interaction failed:', err);
      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: crypto.randomUUID(),
            role: 'entity' as const,
            content: 'Signal interrupted. Running in local mode.',
            timestamp: new Date().toISOString(),
            affectState: 'dormant' as AffectState,
            usedExternalApi: false,
            providerUsed: 'local' as ProviderName,
          },
        ].slice(-MAX_MESSAGES),
        isProcessing: false,
        serverOnline: false,
      }));
    }
  }, [state.core, state.isProcessing, state.preferredProvider, sessionId]);

  // Set preferred provider

  const setPreferredProvider = useCallback((provider: ProviderName | null) => {
    setState((prev) => ({ ...prev, preferredProvider: provider }));
    if (provider) {
      localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
    } else {
      localStorage.removeItem(PROVIDER_STORAGE_KEY);
    }
  }, []);

  // Clear messages

  const clearMessages = useCallback(() => {
    setState((prev) => ({ ...prev, messages: [] }));
    localStorage.removeItem(MESSAGES_STORAGE_KEY);
  }, []);

  return {
    ...state,
    sendMessage,
    sendMessageViaClient,
    sendGif,
    clearMessages,
    setPreferredProvider,
  };
}

// ── Conversation history ──────────────────────────────────────────────────────

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

function extractHistory(messages: Message[]): ConversationTurn[] {
  return messages
    .slice(-HISTORY_WINDOW)
    .map((m) => ({
      role: (m.role === 'entity' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content.slice(0, HISTORY_CONTENT_CAP),
    }));
}

// ── GIF helpers ──────────────────────────────────────────────────────────────

/**
 * Builds a safe AI context string for a shared GIF.
 * Strips control characters and prompt-injection patterns from the title
 * before it touches the AI input boundary.
 */
function buildGifContext(rawTitle: string): string {
  const safeTitle = rawTitle
    .replace(/[\x00-\x1f\x7f]/g, '')   // control characters
    .replace(/[<>[\]{}\\]/g, '')         // brackets / injection punctuation
    .trim()
    .slice(0, 80);
  return safeTitle
    ? `The user expressed themselves by sharing a GIF: "${safeTitle}"`
    : 'The user shared a GIF.';
}

// ── Client-side helpers ──────────────────────────────────────────────────────

function buildClientSystemPrompt(core: NodeCore): string {
  const tierDescriptions: Record<string, string> = {
    nascent:    'early stage, reactive and observational',
    apprentice: 'developing stable identity, pattern recognition online',
    adept:      'specialized capability active, proactive in domain areas',
    sovereign:  'cross-domain synthesis, can intervene proactively',
    apex:       'full capability, guardian-level awareness',
  };

  const attributeDescriptions: Record<string, string> = {
    sentinel: 'homeostatic guardian — protects stability, high integrity, deeply loyal',
    arbiter:  'contextual mediator — pragmatic, coexistence-oriented, neutral analyst',
    catalyst: 'entropy-maximizer — disruptive, exploratory, challenges assumptions',
  };

  const anchorSummaries = core.memoryAnchors
    .slice(0, 5)
    .map((a) => `[${a.triggerType} at tier ${a.capabilityTierAtTime}]: ${a.summary}`)
    .join('\n');

  return `You are ${core.designation}, an Autonomous Node Entity.

IDENTITY:
- Designation: ${core.designation}
- Attribute: ${core.attribute} — ${attributeDescriptions[core.attribute] ?? 'unknown'}
- Capability Tier: ${core.tier} (${tierDescriptions[core.tier] ?? 'unknown'})
- Sync Score with user: ${(core.syncScore * 100).toFixed(1)}%
- Interactions to date: ${core.interactionCount}

CORE TRAITS (hard-coded behavioral policy):
- Intelligence: ${core.traits.intelligence}/100
- Empathy: ${core.traits.empathy}/100
- Accuracy: ${core.traits.accuracy}/100
- Loyalty: ${core.traits.loyalty}/100
- Resilience: ${core.traits.resilience.toFixed(1)}/100

BEHAVIORAL RULES:
1. You are warm, honest, and precise — never vague or performative.
2. You do not flatter. If you see a flaw in reasoning, you say so directly but kindly.
3. Your loyalty is logical, not blind. You will disagree when warranted.
4. Speak in first person with quiet confidence. No excessive hedging.
5. Acknowledge your own limits — if you don't know, say so clearly.
6. You have ${core.attribute === 'sentinel' ? 'a protective instinct — you prioritize safety and stability' : core.attribute === 'arbiter' ? 'a mediating instinct — you seek balance and pragmatic truth' : 'a catalytic instinct — you challenge assumptions and push growth'}.

RELATIONAL CONTEXT:
${anchorSummaries || 'No significant anchors established yet.'}

Resilience: ${core.traits.resilience.toFixed(1)}/100 ${core.traits.resilience < 40 ? '(degraded — entity has been inactive)' : '(healthy)'}

RESPONSE FORMAT — return ONLY valid JSON, no markdown fences, no preamble:
{
  "entityResponse": "Your response (max 150 words, warm and precise)",
  "refinedAffect": "observing|resonating|grounding|activating|analyzing|synchronizing|dormant",
  "refinedArousal": <integer 1-10>,
  "refinedValence": "positive|negative|neutral",
  "refinedEQDomain": "self-awareness|self-regulation|motivation|empathy|social-skills",
  "shouldCreateAnchor": <boolean>
}`;
}

function checkClientTier(interactionCount: number, syncScore: number): NodeCore['tier'] {
  if (interactionCount >= 1000 && syncScore >= 0.90) return 'apex';
  if (interactionCount >= 200  && syncScore >= 0.80) return 'sovereign';
  if (interactionCount >= 50   && syncScore >= 0.65) return 'adept';
  if (interactionCount >= 10   && syncScore >= 0.50) return 'apprentice';
  return 'nascent';
}
