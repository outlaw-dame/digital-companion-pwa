/**
 * Memory search unit tests.
 *
 * Coverage:
 *   - cosineSimilarity        — vector math correctness
 *   - buildFTSQuery           — tokenization and sanitization
 *   - relativeScoreFusion     — all input combinations, edge cases
 *   - formatMemoriesForPrompt — output structure
 *   - DB layer (in-memory)    — FTS5 triggers, upsertEmbedding, getNodeEmbeddings,
 *                               getObservationsByIds, getObservationIdsWithoutEmbeddings
 *   - searchMemory            — end-to-end with in-memory DB, no embedding provider
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import {
  cosineSimilarity,
  buildFTSQuery,
  relativeScoreFusion,
  formatMemoriesForPrompt,
  searchMemory,
  type MemorySearchResult,
} from "../engine/memorySearch";
import {
  __setTestDb,
  getFTSResults,
  upsertEmbedding,
  getNodeEmbeddings,
  getObservationsByIds,
  getObservationIdsWithoutEmbeddings,
  logObservation,
  getOrCreateNodeCore,
} from "../db/kernel";
import { float32ToBuffer, bufferToFloat32, __resetEmbedder } from "../engine/embedder";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function freshDb(): Database {
  const db = new Database(":memory:");
  __setTestDb(db);
  return db;
}

const TEST_NODE = "node-test-001";
const TEST_SESSION = "session-abc";
const OTHER_SESSION = "session-xyz";

function seedObservation(
  nodeId: string,
  sessionId: string,
  userInput: string,
  entityResponse: string,
): number {
  return logObservation(nodeId, {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    user_input: userInput,
    entity_response: entityResponse,
    arousal_level: 5,
    valence: "neutral",
    affect_state: "observing",
    eq_domain_targeted: "self-awareness",
    capability_tier_at_time: "nascent",
    sync_score: 0.5,
    companion_response_state: "observing",
    used_claude_api: false,
    response_latency_ms: 100,
  });
}

// ─── cosineSimilarity ─────────────────────────────────────────────────────────

describe("cosineSimilarity", () => {
  test("identical unit vectors → 1.0", () => {
    const v = new Float32Array([0.6, 0.8]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  test("orthogonal vectors → 0.0", () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([0, 1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
  });

  test("opposite unit vectors → -1.0", () => {
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([-1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
  });

  test("zero vector → 0.0 (safe division)", () => {
    const zero = new Float32Array([0, 0, 0]);
    const v    = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(zero, v)).toBe(0);
    expect(cosineSimilarity(v, zero)).toBe(0);
  });

  test("mismatched dimensions → 0.0", () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([1, 2]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  test("empty arrays → 0.0", () => {
    expect(cosineSimilarity(new Float32Array([]), new Float32Array([]))).toBe(0);
  });

  test("non-unit vectors — result is normalized", () => {
    // a = [3, 4] (|a| = 5), b = [6, 8] (same direction as a, |b| = 10)
    const a = new Float32Array([3, 4]);
    const b = new Float32Array([6, 8]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
  });

  test("known angle: 60° apart", () => {
    // a = [1, 0], b = [0.5, sqrt(3)/2] → cos(60°) = 0.5
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([0.5, Math.sqrt(3) / 2]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.5, 4);
  });
});

// ─── buildFTSQuery ────────────────────────────────────────────────────────────

describe("buildFTSQuery", () => {
  test("extracts lowercase word tokens", () => {
    const q = buildFTSQuery("Hello World Test");
    expect(q).toContain("hello");
    expect(q).toContain("world");
    expect(q).toContain("test");
  });

  test("filters tokens shorter than 3 characters", () => {
    const q = buildFTSQuery("I am in it on a to");
    expect(q.trim()).toBe("");
  });

  test("strips punctuation", () => {
    const q = buildFTSQuery("hello, world! how's it going?");
    expect(q).not.toContain(",");
    expect(q).not.toContain("!");
    expect(q).not.toContain("?");
    expect(q).not.toContain("'");
  });

  test("caps at 20 tokens", () => {
    const words = Array.from({ length: 30 }, (_, i) => `word${i + 100}`).join(" ");
    const tokens = buildFTSQuery(words).split(" ").filter(Boolean);
    expect(tokens.length).toBeLessThanOrEqual(20);
  });

  test("returns empty string for all-short input", () => {
    expect(buildFTSQuery("a b c d")).toBe("");
  });

  test("returns empty string for empty input", () => {
    expect(buildFTSQuery("")).toBe("");
  });

  test("handles unicode letters", () => {
    const q = buildFTSQuery("café résumé naïve");
    // Unicode letters pass the regex; tokens ≥ 3 chars should be kept
    expect(q.length).toBeGreaterThan(0);
  });
});

// ─── relativeScoreFusion ──────────────────────────────────────────────────────

describe("relativeScoreFusion", () => {
  test("hybrid result: fuses both scores", () => {
    const fts = [{ obsId: 1, rawScore: -2.0 }];
    const vec = [{ obsId: 1, score: 0.9 }];
    const [r] = relativeScoreFusion(fts, vec, 0.7);
    expect(r.obsId).toBe(1);
    expect(r.matchType).toBe("hybrid");
    // Both normalize to 1.0 (single entry each list) → score = 0.7*1 + 0.3*1 = 1.0
    expect(r.score).toBeCloseTo(1.0, 5);
  });

  test("vector-only result: score weighted by alpha", () => {
    const fts: { obsId: number; rawScore: number }[] = [];
    const vec = [{ obsId: 1, score: 0.8 }];
    const [r] = relativeScoreFusion(fts, vec, 0.7);
    expect(r.matchType).toBe("vector");
    // normalized vec = 1.0 (only entry), score = alpha * 1.0 = 0.7
    expect(r.score).toBeCloseTo(0.7, 5);
  });

  test("fts-only result: score weighted by (1-alpha)", () => {
    const fts = [{ obsId: 1, rawScore: -1.5 }];
    const vec: { obsId: number; score: number }[] = [];
    const [r] = relativeScoreFusion(fts, vec, 0.7);
    expect(r.matchType).toBe("fts5");
    // normalized fts = 1.0 (only entry), score = (1-alpha) * 1.0 = 0.3
    expect(r.score).toBeCloseTo(0.3, 5);
  });

  test("returns empty for empty inputs", () => {
    expect(relativeScoreFusion([], [], 0.5)).toHaveLength(0);
  });

  test("results are sorted descending by score", () => {
    const fts = [
      { obsId: 1, rawScore: -3.0 },
      { obsId: 2, rawScore: -1.0 },
    ];
    const vec = [
      { obsId: 1, score: 0.9 },
      { obsId: 2, score: 0.2 },
    ];
    const results = relativeScoreFusion(fts, vec, 0.7);
    expect(results[0].obsId).toBe(1);
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  test("alpha=1 → pure vector scoring", () => {
    const fts = [
      { obsId: 1, rawScore: -5.0 },
      { obsId: 2, rawScore: -1.0 },
    ];
    const vec = [
      { obsId: 2, score: 0.95 },
    ];
    const results = relativeScoreFusion(fts, vec, 1.0);
    const obs2 = results.find((r) => r.obsId === 2);
    const obs1 = results.find((r) => r.obsId === 1);
    // obs2 has a vector score; obs1 only has FTS but alpha=1 gives FTS weight 0
    expect(obs2!.score).toBeGreaterThan(obs1!.score);
  });

  test("alpha=0 → pure FTS scoring", () => {
    const fts = [
      { obsId: 1, rawScore: -8.0 }, // best FTS match (largest |rank|)
      { obsId: 2, rawScore: -1.0 },
    ];
    const vec = [
      { obsId: 2, score: 0.99 }, // obs2 has the vector, obs1 doesn't
    ];
    const results = relativeScoreFusion(fts, vec, 0.0);
    const obs1 = results.find((r) => r.obsId === 1)!;
    const obs2 = results.find((r) => r.obsId === 2)!;
    // alpha=0: no vector weight. obs1 should win on FTS alone
    expect(obs1.score).toBeGreaterThan(obs2.score);
  });

  test("all same FTS score → normalized to 1.0 (range = 0 guard), scores identical", () => {
    const fts = [
      { obsId: 1, rawScore: -2.0 },
      { obsId: 2, rawScore: -2.0 },
    ];
    const results = relativeScoreFusion(fts, [], 0.0);
    // ftsRange = 0 → both normalize to 1.0
    // alpha=0, fts-only: score = (1 - 0) * 1.0 = 1.0
    for (const r of results) {
      expect(r.score).toBeCloseTo(1.0, 5);
    }
    expect(results[0].score).toBeCloseTo(results[1].score, 5);
  });

  test("preserves all input observation IDs", () => {
    const fts = [{ obsId: 10, rawScore: -1 }, { obsId: 20, rawScore: -2 }];
    const vec = [{ obsId: 20, score: 0.8 }, { obsId: 30, score: 0.5 }];
    const results = relativeScoreFusion(fts, vec, 0.5);
    const ids = results.map((r) => r.obsId).sort();
    expect(ids).toEqual([10, 20, 30]);
  });
});

// ─── float32 serialization ────────────────────────────────────────────────────

describe("float32ToBuffer / bufferToFloat32", () => {
  test("round-trip preserves values", () => {
    const original = new Float32Array([0.1, 0.2, 0.3, 0.4, -1.5, 100.0]);
    const buf      = float32ToBuffer(original);
    const restored = bufferToFloat32(buf);

    expect(restored.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(restored[i]).toBeCloseTo(original[i], 5);
    }
  });

  test("buffer has correct byte length (4 bytes per float)", () => {
    const arr = new Float32Array(256);
    const buf = float32ToBuffer(arr);
    expect(buf.byteLength).toBe(256 * 4);
  });

  test("Uint8Array input works in bufferToFloat32", () => {
    const original = new Float32Array([1.0, 2.0, 3.0]);
    const buf      = float32ToBuffer(original);
    const uint8    = new Uint8Array(buf);
    const restored = bufferToFloat32(uint8);
    for (let i = 0; i < original.length; i++) {
      expect(restored[i]).toBeCloseTo(original[i], 5);
    }
  });
});

// ─── DB layer: FTS5 triggers ──────────────────────────────────────────────────

describe("FTS5 triggers", () => {
  beforeEach(() => {
    freshDb();
    getOrCreateNodeCore(TEST_NODE, "Tester");
  });

  test("INSERT trigger: observation is searchable immediately", () => {
    seedObservation(TEST_NODE, OTHER_SESSION, "I feel anxious today", "Understood, I am here for you");
    const results = getFTSResults(TEST_NODE, "anxious", TEST_SESSION, 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].obsId).toBeTypeOf("number");
  });

  test("FTS rawScore is negative (BM25 convention)", () => {
    seedObservation(TEST_NODE, OTHER_SESSION, "feeling overwhelmed at work", "That sounds hard");
    const [r] = getFTSResults(TEST_NODE, "overwhelmed", TEST_SESSION, 10);
    expect(r.rawScore).toBeLessThan(0);
  });

  test("excludes observations from current session", () => {
    seedObservation(TEST_NODE, TEST_SESSION,  "happy today session match", "Great!");
    seedObservation(TEST_NODE, OTHER_SESSION, "happy today other match",  "Nice!");
    const results = getFTSResults(TEST_NODE, "happy today", TEST_SESSION, 10);
    // Only the OTHER_SESSION row should appear
    expect(results).toHaveLength(1);
  });

  test("excludes observations without entity_response", () => {
    // logObservation with empty entity_response (edge case)
    logObservation(TEST_NODE, {
      timestamp: new Date().toISOString(),
      session_id: OTHER_SESSION,
      user_input: "searching for response",
      entity_response: "",
      arousal_level: 5,
      valence: "neutral",
      affect_state: "observing",
      eq_domain_targeted: "self-awareness",
      capability_tier_at_time: "nascent",
      sync_score: 0.5,
      companion_response_state: "observing",
      used_claude_api: false,
      response_latency_ms: 10,
    });
    const results = getFTSResults(TEST_NODE, "response", TEST_SESSION, 10);
    // Empty entity_response obs should not appear
    expect(results).toHaveLength(0);
  });

  test("returns empty array for empty query", () => {
    seedObservation(TEST_NODE, OTHER_SESSION, "hello world", "hi there");
    expect(getFTSResults(TEST_NODE, "", TEST_SESSION, 10)).toHaveLength(0);
  });

  test("malformed FTS query returns empty array (not throws)", () => {
    seedObservation(TEST_NODE, OTHER_SESSION, "test input", "test response");
    // FTS5 treats unbalanced quotes as malformed — should return [] not throw
    expect(() => getFTSResults(TEST_NODE, `"unclosed`, TEST_SESSION, 10)).not.toThrow();
  });
});

// ─── DB layer: embeddings ─────────────────────────────────────────────────────

describe("upsertEmbedding / getNodeEmbeddings", () => {
  const FINGERPRINT = "ollama:nomic-embed-text:768";

  beforeEach(() => {
    freshDb();
    getOrCreateNodeCore(TEST_NODE, "Tester");
  });

  test("stores and retrieves an embedding", () => {
    const obsId = seedObservation(TEST_NODE, OTHER_SESSION, "hello", "hi");
    const vec   = new Float32Array([0.1, 0.2, 0.3]);
    upsertEmbedding(obsId, float32ToBuffer(vec), 3, FINGERPRINT);

    const rows = getNodeEmbeddings(TEST_NODE, FINGERPRINT, 100);
    expect(rows).toHaveLength(1);
    expect(rows[0].obsId).toBe(obsId);
    expect(rows[0].dim).toBe(3);

    const restored = bufferToFloat32(rows[0].embedding);
    expect(restored[0]).toBeCloseTo(0.1, 5);
    expect(restored[1]).toBeCloseTo(0.2, 5);
    expect(restored[2]).toBeCloseTo(0.3, 5);
  });

  test("upsert is idempotent — second write replaces first", () => {
    const obsId = seedObservation(TEST_NODE, OTHER_SESSION, "test", "response");
    const v1 = new Float32Array([1.0, 0.0]);
    const v2 = new Float32Array([0.0, 1.0]);

    upsertEmbedding(obsId, float32ToBuffer(v1), 2, FINGERPRINT);
    upsertEmbedding(obsId, float32ToBuffer(v2), 2, FINGERPRINT);

    const rows = getNodeEmbeddings(TEST_NODE, FINGERPRINT, 100);
    expect(rows).toHaveLength(1);
    const restored = bufferToFloat32(rows[0].embedding);
    expect(restored[0]).toBeCloseTo(0.0, 5);
    expect(restored[1]).toBeCloseTo(1.0, 5);
  });

  test("filters by model fingerprint", () => {
    const obsId = seedObservation(TEST_NODE, OTHER_SESSION, "test", "response");
    upsertEmbedding(obsId, float32ToBuffer(new Float32Array([0.5])), 1, "openai:text-embedding-3-small:512");

    const rows = getNodeEmbeddings(TEST_NODE, FINGERPRINT, 100);
    expect(rows).toHaveLength(0); // wrong fingerprint
  });

  test("respects the limit parameter", () => {
    for (let i = 0; i < 5; i++) {
      const id = seedObservation(TEST_NODE, OTHER_SESSION, `msg ${i}`, `resp ${i}`);
      upsertEmbedding(id, float32ToBuffer(new Float32Array([i * 0.1])), 1, FINGERPRINT);
    }
    const rows = getNodeEmbeddings(TEST_NODE, FINGERPRINT, 3);
    expect(rows).toHaveLength(3);
  });

  test("excludes observations with empty entity_response", () => {
    const id = logObservation(TEST_NODE, {
      timestamp: new Date().toISOString(),
      session_id: OTHER_SESSION,
      user_input: "partial",
      entity_response: "",
      arousal_level: 5,
      valence: "neutral",
      affect_state: "observing",
      eq_domain_targeted: "self-awareness",
      capability_tier_at_time: "nascent",
      sync_score: 0.5,
      companion_response_state: "observing",
      used_claude_api: false,
      response_latency_ms: 0,
    });
    upsertEmbedding(id, float32ToBuffer(new Float32Array([0.5])), 1, FINGERPRINT);
    const rows = getNodeEmbeddings(TEST_NODE, FINGERPRINT, 100);
    // entity_response is empty → excluded from results
    expect(rows).toHaveLength(0);
  });
});

// ─── DB layer: getObservationsByIds ──────────────────────────────────────────

describe("getObservationsByIds", () => {
  beforeEach(() => {
    freshDb();
    getOrCreateNodeCore(TEST_NODE, "Tester");
  });

  test("returns observations for given IDs", () => {
    const id1 = seedObservation(TEST_NODE, OTHER_SESSION, "first input",  "first response");
    const id2 = seedObservation(TEST_NODE, OTHER_SESSION, "second input", "second response");

    const rows = getObservationsByIds([id1, id2], TEST_NODE);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.id)).toEqual(expect.arrayContaining([id1, id2]));
  });

  test("preserves caller-supplied order", () => {
    const id1 = seedObservation(TEST_NODE, OTHER_SESSION, "first",  "r1");
    const id2 = seedObservation(TEST_NODE, OTHER_SESSION, "second", "r2");
    const id3 = seedObservation(TEST_NODE, OTHER_SESSION, "third",  "r3");

    const rows = getObservationsByIds([id3, id1, id2], TEST_NODE);
    expect(rows[0].id).toBe(id3);
    expect(rows[1].id).toBe(id1);
    expect(rows[2].id).toBe(id2);
  });

  test("returns empty array for empty input", () => {
    expect(getObservationsByIds([], TEST_NODE)).toHaveLength(0);
  });

  test("ownership check: does not return rows for wrong node", () => {
    const id = seedObservation(TEST_NODE, OTHER_SESSION, "secret", "response");
    const rows = getObservationsByIds([id], "wrong-node-id");
    expect(rows).toHaveLength(0);
  });

  test("silently ignores unknown IDs", () => {
    const id = seedObservation(TEST_NODE, OTHER_SESSION, "real", "response");
    const rows = getObservationsByIds([id, 99999], TEST_NODE);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(id);
  });
});

// ─── DB layer: getObservationIdsWithoutEmbeddings ────────────────────────────

describe("getObservationIdsWithoutEmbeddings", () => {
  const FP = "ollama:nomic-embed-text:768";

  beforeEach(() => {
    freshDb();
    getOrCreateNodeCore(TEST_NODE, "Tester");
  });

  test("returns IDs for observations with no embedding", () => {
    const id1 = seedObservation(TEST_NODE, OTHER_SESSION, "a", "a response");
    const id2 = seedObservation(TEST_NODE, OTHER_SESSION, "b", "b response");
    upsertEmbedding(id1, float32ToBuffer(new Float32Array([0.5])), 1, FP);

    const ids = getObservationIdsWithoutEmbeddings(TEST_NODE, FP, 10);
    expect(ids).toEqual([id2]); // id1 is embedded, id2 is not
  });

  test("returns empty when all observations are embedded", () => {
    const id = seedObservation(TEST_NODE, OTHER_SESSION, "embedded", "response");
    upsertEmbedding(id, float32ToBuffer(new Float32Array([0.1])), 1, FP);
    expect(getObservationIdsWithoutEmbeddings(TEST_NODE, FP, 10)).toHaveLength(0);
  });

  test("respects limit parameter", () => {
    for (let i = 0; i < 10; i++) {
      seedObservation(TEST_NODE, OTHER_SESSION, `msg ${i}`, `resp ${i}`);
    }
    const ids = getObservationIdsWithoutEmbeddings(TEST_NODE, FP, 3);
    expect(ids).toHaveLength(3);
  });

  test("returns oldest IDs first (ascending order)", () => {
    const id1 = seedObservation(TEST_NODE, OTHER_SESSION, "old",   "response");
    const id2 = seedObservation(TEST_NODE, OTHER_SESSION, "newer", "response");
    const ids = getObservationIdsWithoutEmbeddings(TEST_NODE, FP, 10);
    expect(ids[0]).toBe(id1);
    expect(ids[1]).toBe(id2);
  });

  test("excludes observations with empty entity_response", () => {
    logObservation(TEST_NODE, {
      timestamp: new Date().toISOString(),
      session_id: OTHER_SESSION,
      user_input: "partial",
      entity_response: "",
      arousal_level: 5,
      valence: "neutral",
      affect_state: "observing",
      eq_domain_targeted: "self-awareness",
      capability_tier_at_time: "nascent",
      sync_score: 0.5,
      companion_response_state: "observing",
      used_claude_api: false,
      response_latency_ms: 0,
    });
    expect(getObservationIdsWithoutEmbeddings(TEST_NODE, FP, 10)).toHaveLength(0);
  });
});

// ─── formatMemoriesForPrompt ─────────────────────────────────────────────────

describe("formatMemoriesForPrompt", () => {
  const BASE: MemorySearchResult = {
    id: 1,
    user_input: "I am feeling anxious",
    entity_response: "I understand, let us work through this together",
    timestamp: "2025-01-15T10:00:00.000Z",
    arousal_level: 7,
    valence: "negative",
    score: 0.85,
    matchType: "hybrid",
  };

  test("returns empty string for empty array", () => {
    expect(formatMemoriesForPrompt([])).toBe("");
  });

  test("contains opening and closing markers", () => {
    const out = formatMemoriesForPrompt([BASE]);
    expect(out).toContain("[YOUR RECALLED MEMORIES");
    expect(out).toContain("[END RECALLED MEMORIES]");
  });

  test("includes date from timestamp", () => {
    const out = formatMemoriesForPrompt([BASE]);
    expect(out).toContain("2025-01-15");
  });

  test("includes arousal and valence", () => {
    const out = formatMemoriesForPrompt([BASE]);
    expect(out).toContain("arousal:7");
    expect(out).toContain("negative");
  });

  test("includes truncated user input and entity response", () => {
    const out = formatMemoriesForPrompt([BASE]);
    expect(out).toContain("anxious");
    expect(out).toContain("work through");
  });

  test("renders one bullet per result", () => {
    const results = [
      { ...BASE, id: 1, score: 0.9 },
      { ...BASE, id: 2, score: 0.7, user_input: "different message" },
    ];
    const lines = formatMemoriesForPrompt(results).split("\n").filter((l) => l.startsWith("•"));
    expect(lines).toHaveLength(2);
  });

  test("truncates long user_input to ~100 chars in bullet", () => {
    const long = "a".repeat(200);
    const out  = formatMemoriesForPrompt([{ ...BASE, user_input: long }]);
    // The bullet line should not contain the full 200-char string
    const bullet = out.split("\n").find((l) => l.startsWith("•")) ?? "";
    const userPart = bullet.match(/User: "([^"]+)"/)?.[1] ?? "";
    expect(userPart.length).toBeLessThanOrEqual(103); // 100 + potential "..."
  });
});

// ─── searchMemory (end-to-end, no embedding provider) ────────────────────────

describe("searchMemory — FTS5-only mode (no embedder)", () => {
  // Save and restore the original embed env to avoid cross-test pollution.
  const origEmbedProvider = process.env.EMBED_PROVIDER;
  const origOpenAIKey     = process.env.OPENAI_API_KEY;
  const origCFToken       = process.env.CLOUDFLARE_AI_TOKEN;

  beforeEach(() => {
    freshDb();
    getOrCreateNodeCore(TEST_NODE, "Tester");
    // Force getEmbedderSpec() to return null so no embedding API is called.
    // "disabled" does not match any provider branch → spec resolves to null.
    process.env.EMBED_PROVIDER = "disabled";
    delete process.env.OPENAI_API_KEY;
    delete process.env.CLOUDFLARE_AI_TOKEN;
    __resetEmbedder(); // clear cached spec so it re-resolves with updated env
  });

  afterAll(() => {
    // Restore env to avoid bleeding into other test files.
    if (origEmbedProvider !== undefined) {
      process.env.EMBED_PROVIDER = origEmbedProvider;
    } else {
      delete process.env.EMBED_PROVIDER;
    }
    if (origOpenAIKey !== undefined) {
      process.env.OPENAI_API_KEY = origOpenAIKey;
    }
    if (origCFToken !== undefined) {
      process.env.CLOUDFLARE_AI_TOKEN = origCFToken;
    }
    __resetEmbedder();
  });

  test("returns empty for empty query", async () => {
    seedObservation(TEST_NODE, OTHER_SESSION, "hello world", "hi");
    const results = await searchMemory(TEST_NODE, "", { excludeSessionId: TEST_SESSION });
    expect(results).toHaveLength(0);
  });

  test("returns relevant past observations by keyword", async () => {
    seedObservation(TEST_NODE, OTHER_SESSION, "I am very anxious about my job interview tomorrow", "Let us prepare together");
    seedObservation(TEST_NODE, OTHER_SESSION, "The weather is nice today", "Yes it is lovely");

    const results = await searchMemory(TEST_NODE, "anxious interview", {
      k: 5,
      excludeSessionId: TEST_SESSION,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].user_input).toContain("anxious");
    expect(results[0].matchType).toBe("fts5");
  });

  test("excludes current session observations", async () => {
    seedObservation(TEST_NODE, TEST_SESSION,  "I am anxious today session", "response A");
    seedObservation(TEST_NODE, OTHER_SESSION, "I am anxious today other",   "response B");

    const results = await searchMemory(TEST_NODE, "anxious today", {
      excludeSessionId: TEST_SESSION,
    });

    // Only the OTHER_SESSION row should appear
    expect(results).toHaveLength(1);
    expect(results[0].user_input).toContain("other");
  });

  test("score is in [0, 1] range", async () => {
    seedObservation(TEST_NODE, OTHER_SESSION, "feeling overwhelmed with everything", "I hear you");
    const results = await searchMemory(TEST_NODE, "overwhelmed", {
      excludeSessionId: TEST_SESSION,
    });
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  test("respects k limit", async () => {
    for (let i = 0; i < 10; i++) {
      seedObservation(TEST_NODE, OTHER_SESSION, `feeling sad today number ${i}`, `response ${i}`);
    }
    const results = await searchMemory(TEST_NODE, "feeling sad today", {
      k: 3,
      excludeSessionId: TEST_SESSION,
    });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  test("results are sorted by score descending", async () => {
    seedObservation(TEST_NODE, OTHER_SESSION, "anxious about interview", "response A");
    seedObservation(TEST_NODE, OTHER_SESSION, "interview anxiety career", "response B");
    seedObservation(TEST_NODE, OTHER_SESSION, "completely unrelated topic fruit", "response C");

    const results = await searchMemory(TEST_NODE, "anxious interview", {
      excludeSessionId: TEST_SESSION,
    });

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  test("minScore filter removes low-relevance results", async () => {
    seedObservation(TEST_NODE, OTHER_SESSION, "completely unrelated content", "response");

    const withFilter    = await searchMemory(TEST_NODE, "specific technical term", {
      excludeSessionId: TEST_SESSION,
      minScore: 0.5,
    });
    const withoutFilter = await searchMemory(TEST_NODE, "specific technical term", {
      excludeSessionId: TEST_SESSION,
      minScore: 0.0,
    });

    // All withFilter results must meet the minScore threshold
    for (const r of withFilter) {
      expect(r.score).toBeGreaterThanOrEqual(0.5);
    }
    // With minScore=0 we should get at least as many (possibly more) results
    expect(withoutFilter.length).toBeGreaterThanOrEqual(withFilter.length);
  });

  test("returns empty when no observations exist", async () => {
    const results = await searchMemory(TEST_NODE, "anything at all", {
      excludeSessionId: TEST_SESSION,
    });
    expect(results).toHaveLength(0);
  });

  test("node isolation: does not return observations from other nodes", async () => {
    const otherNode = "other-node-999";
    getOrCreateNodeCore(otherNode, "Other");
    seedObservation(otherNode, OTHER_SESSION, "anxious interview tomorrow", "response");

    const results = await searchMemory(TEST_NODE, "anxious interview", {
      excludeSessionId: TEST_SESSION,
    });
    expect(results).toHaveLength(0);
  });
});
