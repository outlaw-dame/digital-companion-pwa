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
  getRecentConversation,
  getThreadContext,
  getLastObservation,
  deleteObservation,
} from "../db/kernel";
import {
  processLocally,
  computeNewSyncScore,
  checkTierPromotion,
  generateLocalResponse,
} from "./syncBridge";
import { getRegistry } from "./providers/registry";
import { resolveRouting } from "./router";
import { detectExplicitMemoryRequest, detectDeleteRequest } from "./memoryDetection";
import { checkDeletionSafety, safetyHoldResponse } from "./safetyGate";
import { processLinks, formatLinksForPrompt } from "./linkProcessor";
import { processFeedsFromText, formatFeedsForPrompt } from "./feedProcessor";
import { linkEntities, formatEntitiesForPrompt } from "./entityLinker";
import type { ProviderName } from "./providers/interface";

const LOCAL_CONFIDENCE_THRESHOLD = 0.75;

function memoryAckResponse(designation: string, attribute: NodeCore["attribute"]): string {
  const responses: Record<typeof attribute, string> = {
    sentinel: `Anchored. I've committed this to my persistent record — it will inform how I understand and support you going forward.`,
    arbiter:  `Noted and stored. This context is now part of my working model of you. I'll apply it where it's relevant.`,
    catalyst: `Locked in. I've added this to my core context — expect me to challenge and build on it from here.`,
  };
  return responses[attribute] ?? `I've anchored this, ${designation}. It's now part of my persistent memory.`;
}

export interface ExtendedInteractionRequest extends InteractionRequest {
  preferredProvider?: ProviderName;
}

export interface PipelineResult extends InteractionResponse {
  providerUsed: ProviderName;
  modelUsed: string;
}

export async function processInteraction(
  req: ExtendedInteractionRequest,
): Promise<PipelineResult> {
  const startMs = Date.now();

  // 1. Load / create entity core
  const core = getOrCreateNodeCore(req.currentCore.id, req.currentCore.designation);

  // 2. Explicit delete request — "delete this" / "forget that".
  //    Locally classified. Never reaches an external AI provider.
  //    Safety-gated: high-acuity crisis content is retained regardless.
  const deleteDetection = detectDeleteRequest(req.userInput);

  if (deleteDetection.isDeleteRequest) {
    const last = getLastObservation(core.id);
    let entityResponse: string;

    if (!last) {
      entityResponse = `There's nothing in my recent record to remove, ${core.designation}.`;
    } else {
      const safety = checkDeletionSafety(`${last.user_input} ${last.entity_response}`);
      if (!safety.canDelete) {
        entityResponse = safetyHoldResponse(safety.hold!, core.designation, core.attribute);
      } else {
        deleteObservation(last.id, core.id);
        const deleteAck: Record<typeof core.attribute, string> = {
          sentinel: `Cleared. That exchange has been purged from my local record — it won't inform my future responses.`,
          arbiter:  `Done. I've removed that from my stored context. It no longer exists in my working model.`,
          catalyst: `Erased. Gone from my record — I'm already operating as if it never happened.`,
        };
        entityResponse = deleteAck[core.attribute];
      }
    }

    const newResilience = Math.min(RESILIENCE_MAX, core.traits.resilience + RESILIENCE_REPLENISH_PER_INTERACTION);
    const newSyncScore = Math.min(1, core.syncScore + 0.005);
    const updatedCore: NodeCore = {
      ...core,
      traits: { ...core.traits, resilience: newResilience },
      syncScore: newSyncScore,
      interactionCount: core.interactionCount + 1,
      lastInteraction: new Date().toISOString(),
    };
    updateNodeCore(updatedCore);

    const obsId = logObservation(core.id, {
      timestamp: new Date().toISOString(),
      session_id: req.sessionId,
      user_input: req.userInput,
      entity_response: entityResponse,
      arousal_level: 5,
      valence: "neutral",
      affect_state: "synchronizing",
      eq_domain_targeted: "self-awareness",
      capability_tier_at_time: core.tier,
      sync_score: newSyncScore,
      companion_response_state: "synchronizing",
      used_claude_api: false,
      response_latency_ms: Date.now() - startMs,
    });

    return {
      updatedCore,
      signal: processLocally(req.userInput, core),
      entityResponse,
      affectState: "synchronizing",
      usedClaudeApi: false,
      shouldCreateAnchor: false,
      linkPreviews: [],
      feedPreviews: [],
      linkedEntities: [],
      parentObservationId: req.parentObservationId ?? null,
      providerUsed: "local",
      modelUsed: "delete-gate-v1",
      observationId: obsId,
    };
  }

  // 3. Explicit memory request — handled entirely locally before any routing.
  //    The user is explicitly telling the entity to remember something.
  //    This never reaches an external AI provider.
  const memoryDetection = detectExplicitMemoryRequest(req.userInput);

  if (memoryDetection.isMemoryRequest) {
    let anchorSummary: string;
    if (memoryDetection.content) {
      anchorSummary = memoryDetection.content;
    } else {
      // "remember this" with no content — anchor the previous user turn
      const recent = getRecentConversation(core.id, 1);
      const lastUserTurn = recent.find((t) => t.role === "user");
      anchorSummary = lastUserTurn
        ? `User asked to remember: "${lastUserTurn.content.slice(0, 150)}"`
        : "User requested context be anchored.";
    }

    const anchor: MemoryAnchor = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      summary: anchorSummary,
      emotionalWeight: 0.8,
      capabilityTierAtTime: core.tier,
      triggerType: "explicit_request",
    };
    addMemoryAnchor(core.id, anchor);

    const entityResponse = memoryAckResponse(core.designation, core.attribute);
    const newResilience = Math.min(RESILIENCE_MAX, core.traits.resilience + RESILIENCE_REPLENISH_PER_INTERACTION);
    const newSyncScore = Math.min(1, core.syncScore + 0.005);
    const updatedCore: NodeCore = {
      ...core,
      traits: { ...core.traits, resilience: newResilience },
      syncScore: newSyncScore,
      memoryAnchors: [...core.memoryAnchors, anchor],
      interactionCount: core.interactionCount + 1,
      lastInteraction: new Date().toISOString(),
    };
    updateNodeCore(updatedCore);

    const memObsId = logObservation(core.id, {
      timestamp: new Date().toISOString(),
      session_id: req.sessionId,
      user_input: req.userInput,
      entity_response: entityResponse,
      arousal_level: 5,
      valence: "neutral",
      affect_state: "synchronizing",
      eq_domain_targeted: "self-awareness",
      capability_tier_at_time: core.tier,
      sync_score: newSyncScore,
      companion_response_state: "synchronizing",
      used_claude_api: false,
      response_latency_ms: Date.now() - startMs,
    });

    return {
      updatedCore,
      signal: processLocally(req.userInput, core),
      entityResponse,
      affectState: "synchronizing",
      usedClaudeApi: false,
      shouldCreateAnchor: true,
      linkPreviews: [],
      feedPreviews: [],
      linkedEntities: [],
      parentObservationId: req.parentObservationId ?? null,
      providerUsed: "local",
      modelUsed: "memory-anchor-v1",
      observationId: memObsId,
    };
  }

  // 3. Parallel: local signal + link previews + feed content + entity linking
  //    All are independent; run concurrently to minimize wall-clock latency.
  const [signal, linkPreviews, feedPreviews, linkedEntities] = await Promise.all([
    Promise.resolve(processLocally(req.userInput, core)),
    processLinks(req.userInput, process.env.GOOGLE_SAFE_BROWSING_API_KEY),
    processFeedsFromText(req.userInput),
    linkEntities(req.userInput),
  ]);

  // Augment prompt with all enriched context; original userInput is preserved for logging.
  const linkContext   = formatLinksForPrompt(linkPreviews);
  const feedContext   = formatFeedsForPrompt(feedPreviews);
  const entityContext = formatEntitiesForPrompt(linkedEntities);
  const augmentation  = [linkContext, feedContext, entityContext].filter(Boolean).join("\n");
  const promptInput   = augmentation ? `${req.userInput}\n${augmentation}` : req.userInput;

  // Conversation history: use thread chain when replying to a specific message,
  // otherwise fall back to recent global conversation.
  const conversationHistory = req.parentObservationId != null
    ? getThreadContext(req.parentObservationId, 5)
    : getRecentConversation(core.id, 3);

  // 4. Response generation
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
          const result = await provider.escalate(promptInput, signal, core, patterns, conversationHistory);

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

  // 7. Log observation — entity_response stored locally for future context retrieval
  const latency = Date.now() - startMs;
  const observationId = logObservation(core.id, {
    parent_id: req.parentObservationId ?? null,
    timestamp: new Date().toISOString(),
    session_id: req.sessionId,
    user_input: req.userInput,
    entity_response: entityResponse,
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
    feedPreviews,
    linkedEntities,
    parentObservationId: req.parentObservationId ?? null,
    providerUsed,
    modelUsed,
    observationId,
  };
}
