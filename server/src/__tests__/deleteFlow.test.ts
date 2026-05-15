/**
 * Delete flow integration tests.
 * Uses an in-memory SQLite database via __setTestDb to avoid touching
 * the real ane_kernel.sqlite and to keep tests hermetic.
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { Database } from "bun:sqlite";
import {
  __setTestDb,
  getOrCreateNodeCore,
  logObservation,
  getLastObservation,
  getObservation,
  deleteObservation,
  deleteMemoryAnchor,
  addMemoryAnchor,
} from "../db/kernel";
import type { MemoryAnchor } from "../types/core";
import { randomUUID } from "crypto";

// ─── Setup ────────────────────────────────────────────────────────────────────

const NODE_ID = randomUUID();
const SESSION_ID = randomUUID();

function makeObservation(override: Partial<Parameters<typeof logObservation>[1]> = {}) {
  return logObservation(NODE_ID, {
    timestamp: new Date().toISOString(),
    session_id: SESSION_ID,
    user_input: "test input",
    entity_response: "test response",
    arousal_level: 5,
    valence: "neutral",
    affect_state: "observing",
    eq_domain_targeted: "self-awareness",
    capability_tier_at_time: "nascent",
    sync_score: 0.5,
    companion_response_state: "observing",
    used_claude_api: false,
    response_latency_ms: 0,
    ...override,
  });
}

beforeAll(() => {
  // Inject in-memory DB — all kernel functions will use this for the lifetime of the test file
  const db = new Database(":memory:");
  __setTestDb(db);
  // Create the node so foreign key constraints are satisfied
  getOrCreateNodeCore(NODE_ID, "TestNode");
});

// Note: tests use unique IDs per run so state isolation is achieved without
// resetting the in-memory DB between individual tests.

// ─── logObservation returns rowid ─────────────────────────────────────────────

describe("logObservation", () => {
  test("returns a positive integer rowid", () => {
    const id = makeObservation();
    expect(typeof id).toBe("number");
    expect(id).toBeGreaterThan(0);
  });

  test("returns incrementing rowids for sequential inserts", () => {
    const id1 = makeObservation();
    const id2 = makeObservation();
    expect(id2).toBeGreaterThan(id1);
  });
});

// ─── getLastObservation ───────────────────────────────────────────────────────

describe("getLastObservation", () => {
  test("returns the most recently inserted observation", () => {
    makeObservation({ user_input: "earlier message" });
    const id = makeObservation({ user_input: "latest message" });

    const last = getLastObservation(NODE_ID);
    expect(last).not.toBeNull();
    expect(last!.id).toBe(id);
    expect(last!.user_input).toBe("latest message");
  });

  test("returns null for a node with no observations", () => {
    const unknown = getLastObservation(randomUUID());
    expect(unknown).toBeNull();
  });

  test("node_id in result matches the query node", () => {
    makeObservation();
    const last = getLastObservation(NODE_ID);
    expect(last!.node_id).toBe(NODE_ID);
  });
});

// ─── getObservation ───────────────────────────────────────────────────────────

describe("getObservation", () => {
  test("returns observation when id and nodeId match", () => {
    const id = makeObservation({ user_input: "get me by id" });
    const obs = getObservation(id, NODE_ID);
    expect(obs).not.toBeNull();
    expect(obs!.id).toBe(id);
    expect(obs!.user_input).toBe("get me by id");
  });

  test("returns null for wrong nodeId (ownership check)", () => {
    const id = makeObservation();
    const obs = getObservation(id, randomUUID());
    expect(obs).toBeNull();
  });

  test("returns null for nonexistent id", () => {
    const obs = getObservation(999_999_999, NODE_ID);
    expect(obs).toBeNull();
  });
});

// ─── deleteObservation ────────────────────────────────────────────────────────

describe("deleteObservation", () => {
  test("deletes an existing observation and returns true", () => {
    const id = makeObservation();
    const deleted = deleteObservation(id, NODE_ID);
    expect(deleted).toBe(true);
  });

  test("deleted observation is no longer retrievable", () => {
    const id = makeObservation();
    deleteObservation(id, NODE_ID);
    const obs = getObservation(id, NODE_ID);
    expect(obs).toBeNull();
  });

  test("returns false for wrong nodeId — ownership enforcement", () => {
    const id = makeObservation();
    const deleted = deleteObservation(id, randomUUID());
    expect(deleted).toBe(false);
    // Original should still exist
    expect(getObservation(id, NODE_ID)).not.toBeNull();
  });

  test("returns false for nonexistent id", () => {
    const deleted = deleteObservation(999_999_999, NODE_ID);
    expect(deleted).toBe(false);
  });

  test("is idempotent — second delete returns false", () => {
    const id = makeObservation();
    expect(deleteObservation(id, NODE_ID)).toBe(true);
    expect(deleteObservation(id, NODE_ID)).toBe(false);
  });

  test("does not affect other observations", () => {
    const id1 = makeObservation({ user_input: "keep me" });
    const id2 = makeObservation({ user_input: "delete me" });
    deleteObservation(id2, NODE_ID);
    expect(getObservation(id1, NODE_ID)).not.toBeNull();
    expect(getObservation(id2, NODE_ID)).toBeNull();
  });
});

// ─── deleteMemoryAnchor ───────────────────────────────────────────────────────

describe("deleteMemoryAnchor", () => {
  function makeAnchor(): MemoryAnchor {
    const anchor: MemoryAnchor = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      summary: "test anchor",
      emotionalWeight: 0.5,
      capabilityTierAtTime: "nascent",
      triggerType: "explicit_request",
    };
    addMemoryAnchor(NODE_ID, anchor);
    return anchor;
  }

  test("deletes an existing anchor and returns true", () => {
    const anchor = makeAnchor();
    const deleted = deleteMemoryAnchor(anchor.id, NODE_ID);
    expect(deleted).toBe(true);
  });

  test("returns false for wrong nodeId", () => {
    const anchor = makeAnchor();
    const deleted = deleteMemoryAnchor(anchor.id, randomUUID());
    expect(deleted).toBe(false);
  });

  test("returns false for nonexistent anchor id", () => {
    const deleted = deleteMemoryAnchor(randomUUID(), NODE_ID);
    expect(deleted).toBe(false);
  });

  test("is idempotent — second delete returns false", () => {
    const anchor = makeAnchor();
    expect(deleteMemoryAnchor(anchor.id, NODE_ID)).toBe(true);
    expect(deleteMemoryAnchor(anchor.id, NODE_ID)).toBe(false);
  });
});
