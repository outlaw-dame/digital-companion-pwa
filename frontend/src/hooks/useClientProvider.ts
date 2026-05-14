import { useState, useEffect, useCallback } from 'react';
import { ClientAIProvider, DownloadProgress, detectWebGPU } from '../engine/providers/clientInterface';
import { WebLLMProvider } from '../engine/providers/webllm';
import { LiteRTProvider } from '../engine/providers/litert';

export const useClientProvider = () => {
  const [provider, setProvider] = useState<ClientAIProvider | null>(null);
  const [status, setStatus] = useState<DownloadProgress>({ status: 'idle', progress: 0 });
  const [capabilities, setCapabilities] = useState({ webGPU: false, wasm: true });

  useEffect(() => {
    detectWebGPU().then(supported => setCapabilities(prev => ({ ...prev, webGPU: supported })));
  }, []);

  const selectProvider = useCallback(async (id: 'webllm' | 'litert') => {
    if (provider) await provider.dispose();
    
    const newProvider = id === 'webllm' ? new WebLLMProvider() : new LiteRTProvider();
    setProvider(newProvider);
    setStatus({ status: 'idle', progress: 0 });
  }, [provider]);

  const initialize = useCallback(async () => {
    if (!provider) return;
    try {
      await provider.initialize((progress) => setStatus(progress));
    } catch (error) {
      setStatus({ status: 'error', progress: 0, message: String(error) });
    }
  }, [provider]);

  return {
    provider,
    status,
    capabilities,
    selectProvider,
    initialize
  };
};
