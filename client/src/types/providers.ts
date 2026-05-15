/**
 * Provider types — client side
 * Mirrors server/src/engine/providers/interface.ts
 */

export type ProviderName =
  | 'claude'
  | 'cloudflare'
  | 'ollama'
  | 'gemini'
  | 'openai'
  | 'local'
  | 'webllm'
  | 'litert';

export interface ProviderMeta {
  icon: string;
  color: string;
  privacyNote: string;
}

export const PROVIDER_META: Record<ProviderName, ProviderMeta> = {
  claude: {
    icon: '◆',
    color: '#d97706',
    privacyNote: 'Data processed by Anthropic API — not used for training.',
  },
  gemini: {
    icon: '✦',
    color: '#4285f4',
    privacyNote: 'Data processed by Google API — subject to Google privacy policy.',
  },
  openai: {
    icon: '◍',
    color: '#10a37f',
    privacyNote: 'Data processed by OpenAI API — subject to OpenAI privacy policy.',
  },
  cloudflare: {
    icon: '☁',
    color: '#f97316',
    privacyNote: 'Open-source models on Cloudflare edge — data not used for training.',
  },
  ollama: {
    icon: '⬡',
    color: '#10b981',
    privacyNote: 'Fully local — zero data leaves your device.',
  },
  local: {
    icon: '◎',
    color: '#6b7280',
    privacyNote: 'Rule-based only — no external calls.',
  },
  webllm: {
    icon: '⚡',
    color: '#8b5cf6',
    privacyNote: 'In-browser WebGPU inference — zero data leaves your device.',
  },
  litert: {
    icon: '◈',
    color: '#06b6d4',
    privacyNote: 'Google LiteRT on-device — zero data leaves your device.',
  },
};
