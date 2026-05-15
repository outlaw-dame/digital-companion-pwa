import { describe, test, expect } from "bun:test";

// We can't import resolveRouting directly easily without mocking fetch,
// so test the sanitization logic via a wrapper — we'll test the exported utility
// by extracting its logic. For sanitizeForClassifier, it's not exported.
// Instead, test the routing rules by inspecting the classifyByRules logic
// through resolveRouting with a mock that captures behavior.
// Focus on what IS testable: ensure signals and patterns are sound.

import { resolveRouting } from "../engine/router";
import type { SyncSignal } from "../types/core";
import type { NodeCore } from "../types/core";

const baseSignal: SyncSignal = {
  rawInput: "test",
  processedAt: new Date().toISOString(),
  arousalLevel: 3,
  valence: "neutral",
  dominantEQDomain: "self-awareness",
  suggestedAffect: "observing",
  confidenceScore: 0.5,
  keyTerms: [],
};

const baseCore: NodeCore = {
  id: "00000000-0000-0000-0000-000000000000",
  designation: "Lumina",
  attribute: "sentinel",
  tier: "nascent",
  traits: { intelligence: 90, empathy: 90, accuracy: 90, loyalty: 90, resilience: 80 },
  currentAffect: "observing",
  syncScore: 0.5,
  interactionCount: 5,
  lastInteraction: null,
  memoryAnchors: [],
};

describe("resolveRouting — rule-based", () => {
  test("routes high arousal (>=7) to large tier", async () => {
    const decision = await resolveRouting(
      { ...baseSignal, arousalLevel: 8 }, "I feel overwhelmed", baseCore
    );
    expect(decision.tier).toBe("large");
    expect(decision.usedLLMClassifier).toBe(false);
  });

  test("routes very low confidence (<0.30) to large tier", async () => {
    const decision = await resolveRouting(
      { ...baseSignal, confidenceScore: 0.2 }, "something deeply nuanced", baseCore
    );
    expect(decision.tier).toBe("large");
  });

  test("routes low arousal non-negative to edge tier", async () => {
    const decision = await resolveRouting(
      { ...baseSignal, arousalLevel: 2, valence: "positive" }, "what is the capital of France?", baseCore
    );
    expect(decision.tier).toBe("edge");
    expect(decision.usedLLMClassifier).toBe(false);
  });

  test("routes factual short question to edge tier", async () => {
    const decision = await resolveRouting(
      { ...baseSignal, arousalLevel: 3, valence: "neutral" },
      "what is the weather like today",
      baseCore
    );
    expect(decision.tier).toBe("edge");
  });

  test("routes short input with decent confidence to local", async () => {
    const decision = await resolveRouting(
      { ...baseSignal, confidenceScore: 0.65 }, "hi", baseCore
    );
    expect(decision.tier).toBe("local");
  });

  test("routes negative valence with elevated arousal to large", async () => {
    const decision = await resolveRouting(
      { ...baseSignal, valence: "negative", arousalLevel: 7 },
      "I am really struggling right now",
      baseCore
    );
    expect(decision.tier).toBe("large");
  });

  test("returns latencyMs", async () => {
    const decision = await resolveRouting(baseSignal, "test", baseCore);
    expect(typeof decision.latencyMs).toBe("number");
    expect(decision.latencyMs).toBeGreaterThanOrEqual(0);
  });

  test("returns signals array with reason strings", async () => {
    const decision = await resolveRouting(
      { ...baseSignal, arousalLevel: 8 }, "overwhelmed", baseCore
    );
    expect(Array.isArray(decision.signals)).toBe(true);
    expect(decision.signals.length).toBeGreaterThan(0);
  });
});
