/**
 * useClientProvider — React hook for client-side AI inference
 *
 * Manages the full lifecycle of in-browser providers (WebLLM, LiteRT):
 *   1. Capability detection (WebGPU / WASM)
 *   2. Model selection
 *   3. Download + initialization with progress tracking
 *   4. Inference with streaming
 *   5. Cleanup on unmount / provider switch
 *
 * These providers run ENTIRELY in the browser — no server call.
 * They short-circuit the /api/interact pipeline when active.
 *
 * The hook exposes:
 *   - clientProviders: available client-side providers with capability info
 *   - activeClientProvider: currently loaded provider name
 *   - downloadProgress: current download/load state
 *   - selectClientProvider: load a specific provider + model
 *   - generateWithClient: run inference (bypasses server)
 *   - releaseClientProvider: unload model from memory
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  ClientAIProvider,
  ClientEscalationResult,
  DownloadProgress,
  ClientModelOption,
} from '../engine/providers/clientInterface';
import {
  detectWebGPU,
  detectWASM,
} from '../engine/providers/clientInterface';
import { WEBLLM_MODELS } from '../engine/providers/webllm';
import { LITERT_MODELS } from '../engine/providers/litert';

// ── Types ───────────────────────────────────────────────────────────────────

export interface ClientProviderCapability {
  name: 'webllm' | 'litert';
  label: string;
  description: string;
  privacyNote: string;
  isSupported: boolean;          // Browser supports this provider
  requiresWebGPU: boolean;
  models: ClientModelOption[];
}

export interface ClientProviderState {
  capabilities: ClientProviderCapability[];
  activeProvider: 'webllm' | 'litert' | null;
  activeModelId: string | null;
  downloadProgress: DownloadProgress | null;
  isInferring: boolean;
  streamingResponse: string;     // Partial response during streaming
  capabilityCheckDone: boolean;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useClientProvider() {
  const providerRef = useRef<ClientAIProvider | null>(null);

  const [state, setState] = useState<ClientProviderState>({
    capabilities: [],
    activeProvider: null,
    activeModelId: null,
    downloadProgress: null,
    isInferring: false,
    streamingResponse: '',
    capabilityCheckDone: false,
  });

  // Capability detection on mount
  useEffect(() => {
    let mounted = true;

    const checkCapabilities = async () => {
      const hasWebGPU = await detectWebGPU();
      const hasWASM = detectWASM();

      const capabilities: ClientProviderCapability[] = [
        {
          name: 'webllm',
          label: 'WebLLM (MLC)',
          description: 'In-browser inference via WebGPU. Llama, Phi, Gemma, Mistral.',
          privacyNote: 'Fully local — zero data leaves your device. Requires WebGPU.',
          isSupported: hasWebGPU,
          requiresWebGPU: true,
          models: WEBLLM_MODELS,
        },
        {
          name: 'litert',
          label: 'LiteRT (Google)',
          description: "Google's LiteRT-LM stack. Powers Chrome & Pixel. Gemma-native.",
          privacyNote: 'Fully local — zero data leaves your device. WebGPU or WASM.',
          isSupported: hasWebGPU || hasWASM,
          requiresWebGPU: false,
          models: LITERT_MODELS,
        },
      ];

      if (mounted) {
        setState((prev) => ({ ...prev, capabilities, capabilityCheckDone: true }));
      }
    };

    checkCapabilities();
    return () => { mounted = false; };
  }, []);

  // Select and initialize a client provider
  const selectClientProvider = useCallback(
    async (
      providerName: 'webllm' | 'litert',
      modelId?: string,
      modelUrl?: string,  // Required for LiteRT — URL to .litertlm file
    ) => {
      // Dispose existing provider first
      if (providerRef.current) {
        providerRef.current.dispose();
        providerRef.current = null;
      }

      setState((prev) => ({
        ...prev,
        activeProvider: null,
        activeModelId: null,
        downloadProgress: { status: 'loading', progress: 0, message: 'Loading provider…' },
        streamingResponse: '',
      }));

      try {
        let provider: ClientAIProvider;

        if (providerName === 'webllm') {
          const { WebLLMProvider } = await import('../engine/providers/webllm');
          provider = new WebLLMProvider(modelId);
        } else {
          const { LiteRTProvider, DEFAULT_LITERT_MODEL } = await import('../engine/providers/litert');
          if (!modelUrl) throw new Error('LiteRT requires a modelUrl (path to .litertlm file)');
          provider = new LiteRTProvider({
            modelId: modelId ?? DEFAULT_LITERT_MODEL,
            modelUrl,
          });
        }

        await provider.initialize((progress) => {
          setState((prev) => ({ ...prev, downloadProgress: progress }));
        });

        providerRef.current = provider;

        setState((prev) => ({
          ...prev,
          activeProvider: providerName,
          activeModelId: provider.modelId,
          downloadProgress: { status: 'ready', progress: 1, message: 'Ready' },
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setState((prev) => ({
          ...prev,
          downloadProgress: {
            status: 'error',
            progress: 0,
            message: `Failed to load provider`,
            error: message,
          },
        }));
        throw err;
      }
    },
    [],
  );

  // Run inference with the active client provider (streaming)
  const generateWithClient = useCallback(
    async (
      systemPrompt: string,
      userPrompt: string,
    ): Promise<ClientEscalationResult | null> => {
      const provider = providerRef.current;
      if (!provider) return null;

      setState((prev) => ({ ...prev, isInferring: true, streamingResponse: '' }));

      try {
        const result = await provider.generateStream(
          systemPrompt,
          userPrompt,
          (token, done) => {
            if (!done) {
              setState((prev) => ({
                ...prev,
                streamingResponse: prev.streamingResponse + token,
              }));
            }
          },
        );

        setState((prev) => ({ ...prev, isInferring: false, streamingResponse: '' }));
        return result;
      } catch (err) {
        setState((prev) => ({ ...prev, isInferring: false }));
        throw err;
      }
    },
    [],
  );

  // Release model from GPU/WASM memory
  const releaseClientProvider = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.dispose();
      providerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      activeProvider: null,
      activeModelId: null,
      downloadProgress: null,
      streamingResponse: '',
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      providerRef.current?.dispose();
    };
  }, []);

  return {
    ...state,
    selectClientProvider,
    generateWithClient,
    releaseClientProvider,
    isClientProviderActive: state.activeProvider !== null,
    isReady: state.downloadProgress?.status === 'ready',
  };
}
