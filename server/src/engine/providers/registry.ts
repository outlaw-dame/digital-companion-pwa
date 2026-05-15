/**
 * Provider Registry (v2: Tier-Aware)
 *
 * Governance layer for AI provider selection.
 * Knows about all configured providers and which routing tier each belongs to.
 *
 * Provider tiers:
 *   edge  → Cloudflare Workers AI, Ollama (fast, cheap, always-on)
 *   large → Claude, Gemini, OpenAI (high-fidelity, costlier)
 *
 * Default fallback chains:
 *   edge  : Cloudflare → Ollama
 *   large : Claude → Gemini → OpenAI → Cloudflare → Ollama
 *
 * If no provider for the requested tier is available, the registry
 * automatically falls through to any available provider.
 */

import type { AIProvider, ProviderName, ProviderTier } from "./interface";
import { PROVIDER_TIERS } from "./interface";
import { ClaudeProvider } from "./claude";
import { CloudflareProvider } from "./cloudflare";
import { OllamaProvider } from "./ollama";
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";

// ─── Provider Status ──────────────────────────────────────────────────────────

export interface ProviderStatus {
  name: ProviderName;
  label: string;
  modelId: string;
  isAvailable: boolean;
  isPrimary: boolean;
  tier: ProviderTier;
  description: string;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export class ProviderRegistry {
  private readonly providers: AIProvider[];

  // Cloudflare credentials stored for use by the router's LLM classifier
  readonly cfToken: string;
  readonly cfAccountId: string;

  constructor() {
    this.cfToken = process.env.CLOUDFLARE_AI_TOKEN ?? "";
    this.cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
    this.providers = this.buildProviders();
  }

  private buildProviders(): AIProvider[] {
    const chain: AIProvider[] = [];

    // ── Claude ────────────────────────────────────────────────────────────────
    const claudeKey = process.env.ANTHROPIC_API_KEY ?? "";
    if (claudeKey) {
      chain.push(new ClaudeProvider({
        provider: "claude",
        apiKey: claudeKey,
        model: process.env.CLAUDE_MODEL,
      }));
    }

    // ── Gemini ────────────────────────────────────────────────────────────────
    const geminiKey = process.env.GEMINI_API_KEY ?? "";
    if (geminiKey) {
      chain.push(new GeminiProvider({
        provider: "gemini",
        apiKey: geminiKey,
        model: process.env.GEMINI_MODEL,
      }));
    }

    // ── OpenAI ────────────────────────────────────────────────────────────────
    const openaiKey = process.env.OPENAI_API_KEY ?? "";
    if (openaiKey) {
      chain.push(new OpenAIProvider({
        provider: "openai",
        apiKey: openaiKey,
        model: process.env.OPENAI_MODEL,
      }));
    }

    // ── Cloudflare Workers AI ─────────────────────────────────────────────────
    if (this.cfToken && this.cfAccountId) {
      chain.push(new CloudflareProvider({
        provider: "cloudflare",
        apiToken: this.cfToken,
        accountId: this.cfAccountId,
        model: process.env.CLOUDFLARE_AI_MODEL,
      }));
    }

    // ── Ollama (always added; fails gracefully if not running) ────────────────
    chain.push(new OllamaProvider({
      provider: "ollama",
      baseUrl: process.env.OLLAMA_BASE_URL,
      model: process.env.OLLAMA_MODEL,
    }));

    return chain;
  }

  /**
   * Returns the first available provider for the given routing tier.
   * Falls back to any available provider if the tier has none.
   *
   * Tier priority orders:
   *   edge  → cloudflare → ollama
   *   large → claude → gemini → openai → cloudflare → ollama
   */
  getProviderForTier(tier: ProviderTier, preferred?: ProviderName): AIProvider | null {
    // Caller's preferred provider wins if it's available
    if (preferred && preferred !== "local") {
      const specific = this.providers.find(
        (p) => p.name === preferred && p.isAvailable(),
      );
      if (specific) return specific;
    }

    const tierOrder: Record<ProviderTier, ProviderName[]> = {
      local:  [],
      edge:   ["cloudflare", "ollama"],
      large:  ["claude", "gemini", "openai", "cloudflare", "ollama"],
    };

    for (const name of tierOrder[tier]) {
      const provider = this.providers.find((p) => p.name === name && p.isAvailable());
      if (provider) return provider;
    }

    // Last resort: any available provider
    return this.providers.find((p) => p.isAvailable()) ?? null;
  }

  /**
   * Returns the first available provider overall (tier-agnostic).
   */
  getPrimaryProvider(): AIProvider | null {
    return this.providers.find((p) => p.isAvailable()) ?? null;
  }

  /**
   * Returns a specific provider by name if available, otherwise primary.
   * Kept for backward compatibility with existing callers.
   */
  getProvider(preferred?: ProviderName): AIProvider | null {
    if (preferred) {
      const specific = this.providers.find(
        (p) => p.name === preferred && p.isAvailable(),
      );
      if (specific) return specific;
    }
    return this.getPrimaryProvider();
  }

  /**
   * Returns status for all known providers (for settings UI).
   */
  getStatus(): ProviderStatus[] {
    const primary = this.getPrimaryProvider();

    const labels: Record<ProviderName, string> = {
      claude:      "Claude (Anthropic)",
      gemini:      "Gemini (Google)",
      openai:      "GPT-4o (OpenAI)",
      cloudflare:  "Workers AI (Cloudflare)",
      ollama:      "Ollama (Local LLM)",
      local:       "Local Only",
    };

    const descriptions: Record<ProviderName, string> = {
      claude:      "Anthropic Claude — highest character fidelity, nuanced emotional depth",
      gemini:      "Google Gemini — strong long-context, multimodal-ready, fast flash tier",
      openai:      "OpenAI GPT-4o — broad capability, strong instruction following",
      cloudflare:  "Cloudflare Workers AI — open models, edge inference, free tier",
      ollama:      "Ollama — fully local, air-gapped, zero data leaves device",
      local:       "Local only — rule-based, no external API calls",
    };

    const statuses: ProviderStatus[] = this.providers.map((p) => ({
      name: p.name,
      label: labels[p.name],
      modelId: p.modelId,
      isAvailable: p.isAvailable(),
      isPrimary: primary?.name === p.name,
      tier: PROVIDER_TIERS[p.name],
      description: descriptions[p.name],
    }));

    if (!statuses.find((s) => s.name === "local")) {
      statuses.push({
        name: "local",
        label: labels.local,
        modelId: "syncBridge-v1",
        isAvailable: true,
        isPrimary: primary === null,
        tier: "local",
        description: descriptions.local,
      });
    }

    return statuses;
  }

  getAvailableCount(): number {
    return this.providers.filter((p) => p.name !== "local" && p.isAvailable()).length;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _registry: ProviderRegistry | null = null;

export function getRegistry(): ProviderRegistry {
  if (!_registry) _registry = new ProviderRegistry();
  return _registry;
}

export function resetRegistry(): void {
  _registry = null;
}
