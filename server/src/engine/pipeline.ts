/**
 * Interaction Pipeline — Main Orchestrator (v3: Router-Aware)
 *
 * Flow per interaction:
 *   1. Load NodeCore from Kernel (with resilience decay applied)
 *   2. Process input through local SyncBridge (always runs, <1ms)
 *   3. Local confidence >= 0.75? -> generate local response, no API call
 *   4. Below threshold -> Router classifies task tier (local / edge / large)
 *      4a. Rule-based classifier runs first (< 1ms, zero cost)
 *      4b. Ambiguous cases: tiny Cloudflare LLM classifier (~200ms, ~$0)
 *   5. Registry selects provider for the routed tier with fallback chain
 *   6. Provider escalates (Claude → Gemini → OpenAI | Cloudflare → Ollama)
 *   7. Update NodeCore (sync score, resilience replenish, tier check)
 *   7. Log observation to Kernel
 *   8. Return to client
 *
 * The ProviderRegistry handles fallback chaining automatically.
 * If all external providers fail, the local SyncBridge response is used.
 */

import { randomUUID } from "crypto";
import type {
  InteractionRequest,
  InteractionResponse,
  NodeCore,
  MemoryAnchor,
} from "../types/core";
import { RESILIENCE_REPLENISH_PER_INTERACTION, RESILIENCE_MAX } from "../types/core";
import {
  getOrCreateNodeCore,
  updateNodeCore,
  logObservation,
  addMemoryAnchor,
  getArousalPatterns,
} from "../db/kernel";
import {
  processLocally,
  computeNewSyncScore,
  checkTierPromotion,
  generateLocalResponse,
} from "./syncBridge";
import { getRegistry } from "./providers/registry";
import { resolveRouting } from "./router";
import { processLinks, formatLinksForPrompt } from "./linkProcessor";
import type { ProviderName } from "./providers/interface";
import type { LinkPreview } from "../types/core";

const LOCAL_CONFIDENCE_THRESHOLD = 0.75;

export interface ExtendedInteractionRequest extends InteractionRequest {
  preferredProvider?: ProviderName;
}

export async function processInteraction(
  req: ExtendedInteractionRequest,
): Promise<InteractionResponse & { providerUsed: ProviderName; modelUsed: string; linkPreviews: LinkPreview[] }> {
  const startMs = Date.now();

  // 1. Load / create entity core
  const core = getOrCreateNodeCore(req.currentCore.id, req.currentCore.designation);

  // 2. Local signal processing + link processing (run concurrently — independent)
  const [signal, linkPreviews] = await Promise.all([
    Promise.resolve(processLocally(req.userInput, core)),
    processLinks(req.userInput, process.env.GOOGLE_SAFE_BROWSING_API_KEY),
  ]);

  // Augmented input: append OG context so the AI has awareness of shared links.
  // The original req.userInput is preserved for DB logging.
  const linkContext = formatLinksForPrompt(linkPreviews);
  const promptInput = linkContext ? `${req.userInput}\n${linkContext}` : req.userInput;

  // 3. Response generation
  let entityResponse: string;
  let usedExternalApi = false;
  let providerUsed: ProviderName = "local";
  let modelUsed = "syncBridge-v1";
  let shouldCreateAnchor = false;
  let refinedSignal = signal;

  if (signal.confidenceScore < LOCAL_CONFIDENCE_THRESHOLD) {
    const registry = getRegistry();

    // Router: classify task tier, then select provider for that tier
    const routing = await resolveRouting(signal, req.userInput, core, {
      cfToken:          registry.cfToken,
      cfAccountId:      registry.cfAccountId,
      preferredProvider: req.preferredProvider,
    });

    console.log(
      `[router] tier=${routing.tier} provider=${routing.preferredProvider ?? "auto"} ` +
      `llm_classifier=${routing.usedLLMClassifier} latency=${routing.latencyMs}ms ` +
      `signals=[${routing.signals.join(", ")}]`,
    );

    // 'local' tier from router means even below 0.75 confidence we generate locally
    if (routing.tier === "local") {
      entityResponse = generateLocalResponse(signal, core);
    } else {
      const provider = registry.getProviderForTier(routing.tier, routing.preferredProvider ?? undefined);

      if (provider) {
        try {
          const patterns = getArousalPatterns(core.id);
          const result = await provider.escalate(promptInput, signal, core, patterns);

          entityResponse = result.entityResponse;
          usedExternalApi = true;
          providerUsed = result.providerUsed;
          modelUsed = result.modelUsed;
          shouldCreateAnchor = result.shouldCreateAnchor;
          refinedSignal = { ...signal, ...result.refinedSignal };
        } catch (err) {
          console.error(`Provider '${provider.name}' failed, using local fallback:`, err);
          entityResponse = generateLocalResponse(signal, core);
        }
      } else {
        entityResponse = generateLocalResponse(signal, core);
      }
    }
  } else {
    entityResponse = generateLocalResponse(signal, core);
  }

  // 4. Update NodeCore
  const newSyncScore = computeNewSyncScore(core.syncScore, refinedSignal, usedExternalApi);
  const newResilience = Math.min(RESILIENCE_MAX, core.traits.resilience + RESILIENCE_REPLENISH_PER_INTERACTION);

  const updatedCore: NodeCore = {
    ...core,
    traits: { ...core.traits, resilience: newResilience },
    currentAffect: refinedSignal.suggestedAffect ?? signal.suggestedAffect,
    syncScore: newSyncScore,
    interactionCount: core.interactionCount + 1,
    lastInteraction: new Date().toISOString(),
  };

  // 5. Tier promotion check
  const newTier = checkTierPromotion(updatedCore);
  const tierPromoted = newTier !== core.tier;
  if (tierPromoted) {
    updatedCore.tier = newTier;
    shouldCreateAnchor = true;
  }

  // 6. Persist
  updateNodeCore(updatedCore);

  // 7. Log observation
  const latency = Date.now() - startMs;
  logObservation(core.id, {
    timestamp: new Date().toISOString(),
    session_id: req.sessionId,
    user_input: req.userInput,
    arousal_level: refinedSignal.arousalLevel ?? signal.arousalLevel,
    valence: refinedSignal.valence ?? signal.valence,
    affect_state: refinedSignal.suggestedAffect ?? signal.suggestedAffect,
    eq_domain_targeted: refinedSignal.dominantEQDomain ?? signal.dominantEQDomain,
    capability_tier_at_time: updatedCore.tier,
    sync_score: newSyncScore,
    companion_response_state: updatedCore.currentAffect,
    used_claude_api: usedExternalApi,
    response_latency_ms: latency,
  });

  // 8. Memory anchor
  if (shouldCreateAnchor) {
    const anchor: MemoryAnchor = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      summary: tierPromoted
        ? `Promoted to ${newTier} tier (${updatedCore.interactionCount} interactions, sync ${(newSyncScore * 100).toFixed(1)}%).`
        : `Significant interaction via ${providerUsed}/${modelUsed}: ${req.userInput.slice(0, 80)}`,
      emotionalWeight: tierPromoted ? 0.9 : Math.min(0.9, refinedSignal.confidenceScore ?? 0.5),
      capabilityTierAtTime: updatedCore.tier,
      triggerType: tierPromoted ? "breakthrough" : "sync_peak",
    };
    addMemoryAnchor(core.id, anchor);
    updatedCore.memoryAnchors = [...updatedCore.memoryAnchors, anchor];
  }

  return {
    updatedCore,
    signal: refinedSignal,
    entityResponse,
    affectState: updatedCore.currentAffect,
    usedClaudeApi: usedExternalApi,
    shouldCreateAnchor,
    linkPreviews,
    providerUsed,
    modelUsed,
  };
}
