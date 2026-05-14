/**
 * Interaction Pipeline — Main Orchestrator
 *
 * Flow per interaction:
 *   1. Load NodeCore from Kernel (with resilience decay applied)
 *   2. Process input through local SyncBridge (fast path)
 *   3. Decide: local response sufficient, or escalate to Claude?
 *   4. Update NodeCore (sync score, resilience replenish, tier check)
 *   5. Log observation to Kernel
 *   6. Return updated state and entity response to client
 *
 * This is the "Yggdrasill" governance layer — but with an explicit override path
 * built in (Claude escalation) so the system can self-correct when local
 * processing is insufficient.
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
} from "./syncBridge";
import {
  shouldEscalateToClaude,
  escalateToClaude,
  generateLocalResponse,
} from "./claudeBridge";

// ─── Main Pipeline ────────────────────────────────────────────────────────────

export async function processInteraction(
  req: InteractionRequest,
): Promise<InteractionResponse> {
  const startMs = Date.now();

  // 1. Load or create entity core (resilience decay applied inside getOrCreate)
  let core = getOrCreateNodeCore(req.currentCore.id, req.currentCore.designation);

  // 2. Local signal processing (fast path, always runs)
  const signal = processLocally(req.userInput, core);

  // 3. Decide on escalation and generate response
  let entityResponse: string;
  let usedClaudeApi = false;
  let shouldCreateAnchor = false;
  let refinedSignal = signal;

  if (shouldEscalateToClaude(signal)) {
    try {
      const patterns = getArousalPatterns(core.id);
      const claudeResult = await escalateToClaude(
        req.userInput,
        signal,
        core,
        patterns,
      );

      entityResponse = claudeResult.entityResponse;
      usedClaudeApi = true;
      shouldCreateAnchor = claudeResult.shouldCreateAnchor;

      // Merge Claude's refinements back into the signal
      refinedSignal = {
        ...signal,
        ...claudeResult.refinedSignal,
      };
    } catch (err) {
      // Claude API failure: fall back to local response gracefully
      console.error("Claude escalation failed, using local fallback:", err);
      entityResponse = generateLocalResponse(signal, core);
    }
  } else {
    entityResponse = generateLocalResponse(signal, core);
  }

  // 4. Update NodeCore state
  const newSyncScore = computeNewSyncScore(
    core.syncScore,
    refinedSignal,
    usedClaudeApi,
  );

  const newResilience = Math.min(
    RESILIENCE_MAX,
    core.traits.resilience + RESILIENCE_REPLENISH_PER_INTERACTION,
  );

  const updatedCore: NodeCore = {
    ...core,
    traits: {
      ...core.traits,
      resilience: newResilience,
    },
    currentAffect: refinedSignal.suggestedAffect ?? signal.suggestedAffect,
    syncScore: newSyncScore,
    interactionCount: core.interactionCount + 1,
    lastInteraction: new Date().toISOString(),
  };

  // Check for tier promotion (never demotes; thresholds are gates)
  const newTier = checkTierPromotion(updatedCore);
  const tierPromoted = newTier !== core.tier;
  if (tierPromoted) {
    updatedCore.tier = newTier;

    // Tier promotions are always memory anchors
    shouldCreateAnchor = true;
  }

  // 5. Persist to Kernel
  updateNodeCore(updatedCore);

  // 6. Log observation
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
    used_claude_api: usedClaudeApi,
    response_latency_ms: latency,
  });

  // 7. Create memory anchor if warranted
  if (shouldCreateAnchor) {
    const anchor: MemoryAnchor = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      summary: tierPromoted
        ? `Entity promoted to ${newTier} tier after ${updatedCore.interactionCount} interactions with sync ${(newSyncScore * 100).toFixed(1)}%.`
        : `High-significance interaction: ${req.userInput.slice(0, 80)}`,
      emotionalWeight: tierPromoted ? 0.9 : Math.min(0.9, refinedSignal.confidenceScore ?? 0.5),
      capabilityTierAtTime: updatedCore.tier,
      triggerType: tierPromoted ? 'breakthrough' : 'sync_peak',
    };
    addMemoryAnchor(core.id, anchor);
    updatedCore.memoryAnchors = [...updatedCore.memoryAnchors, anchor];
  }

  return {
    updatedCore,
    signal: refinedSignal,
    entityResponse,
    affectState: updatedCore.currentAffect,
    usedClaudeApi,
    shouldCreateAnchor,
  };
}
