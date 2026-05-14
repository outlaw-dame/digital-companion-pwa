export type DownloadProgress = {
  status: 'idle' | 'downloading' | 'ready' | 'error';
  progress: number; // 0 to 100
  message?: string;
};

export interface ClientAIProvider {
  id: string;
  name: string;
  isSupported: () => Promise<boolean>;
  initialize: (onProgress?: (progress: DownloadProgress) => void) => Promise<void>;
  generateResponse: (input: string, onToken?: (token: string) => void) => Promise<string>;
  dispose: () => Promise<void>;
}

export const detectWebGPU = async (): Promise<boolean> => {
  if (!navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch (e) {
    return false;
  }
};

export const detectWASM = (): boolean => {
  return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
};
