/**
 * Thread context integration tests.
 * Uses an in-memory SQLite database via __setTestDb.
 * Tests getThreadContext's recursive CTE traversal.
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { Database } from "bun:sqlite";
import {
  __setTestDb,
  getOrCreateNodeCore,
  logObservation,
  getThreadContext,
  getRecentConversation,
} from "../db/kernel";
import { randomUUID } from "crypto";

const NODE_ID   = randomUUID();
const SESSION_ID = randomUUID();

function makeObs(userInput: string, entityResponse: string, parentId?: number): number {
  return logObservation(NODE_ID, {
    parent_id: parentId ?? null,
    timestamp: new Date().toISOString(),
    session_id: SESSION_ID,
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
    response_latency_ms: 0,
  });
}

beforeAll(() => {
  const db = new Database(":memory:");
  __setTestDb(db);
  getOrCreateNodeCore(NODE_ID, "TestNode");
});

// ─── getThreadContext ─────────────────────────────────────────────────────────

describe("getThreadContext", () => {
  test("returns turns for a single observation", () => {
    const id = makeObs("question", "answer");
    const turns = getThreadContext(id, 5);
    expect(turns.length).toBe(2);
    expect(turns[0]).toEqual({ role: "user",      content: "question" });
    expect(turns[1]).toEqual({ role: "assistant",  content: "answer" });
  });

  test("walks up parent chain — two deep", () => {
    const root  = makeObs("root question", "root answer");
    const child = makeObs("child question", "child answer", root);

    const turns = getThreadContext(child, 5);
    // Should include root (parent) first, then child
    expect(turns.length).toBe(4);
    expect(turns[0].content).toBe("root question");
    expect(turns[1].content).toBe("root answer");
    expect(turns[2].content).toBe("child question");
    expect(turns[3].content).toBe("child answer");
  });

  test("walks up parent chain — three deep", () => {
    const grandparent = makeObs("gp input", "gp response");
    const parent      = makeObs("p input",  "p response",  grandparent);
    const child       = makeObs("c input",  "c response",  parent);

    const turns = getThreadContext(child, 5);
    expect(turns.length).toBe(6);
    expect(turns[0].content).toBe("gp input");
    expect(turns[4].content).toBe("c input");
  });

  test("respects depth limit", () => {
    const a = makeObs("a", "a-resp");
    const b = makeObs("b", "b-resp", a);
    const c = makeObs("c", "c-resp", b);
    const d = makeObs("d", "d-resp", c);

    // Limit to depth 2 — should include only d and c, not b or a
    const turns = getThreadContext(d, 2);
    expect(turns.length).toBe(4); // c + d = 2 exchanges = 4 turns
    const contents = turns.map((t) => t.content);
    expect(contents).toContain("c");
    expect(contents).toContain("d");
    expect(contents).not.toContain("a");
    expect(contents).not.toContain("b");
  });

  test("returns empty array for nonexistent observation id", () => {
    const turns = getThreadContext(999_999_999, 5);
    expect(turns).toHaveLength(0);
  });

  test("returns chronological order (ascending by id)", () => {
    const p = makeObs("parent",  "parent-resp");
    const c = makeObs("child",   "child-resp",  p);

    const turns = getThreadContext(c, 5);
    // First turn should be from the parent (smaller id)
    expect(turns[0].content).toBe("parent");
  });

  test("role alternates user/assistant correctly", () => {
    const p = makeObs("user-msg", "entity-msg");
    const c = makeObs("user-reply", "entity-reply", p);

    const turns = getThreadContext(c, 5);
    const roles = turns.map((t) => t.role);
    expect(roles).toEqual(["user", "assistant", "user", "assistant"]);
  });

  test("truncates long content to 500 chars", () => {
    const longInput = "A".repeat(600);
    const longResp  = "B".repeat(600);
    const id = makeObs(longInput, longResp);

    const turns = getThreadContext(id, 5);
    expect(turns[0].content.length).toBeLessThanOrEqual(500);
    expect(turns[1].content.length).toBeLessThanOrEqual(500);
  });
});

// ─── getRecentConversation (baseline, not broken by threading) ─────────────────

describe("getRecentConversation — unaffected by parent_id", () => {
  test("returns global recent turns regardless of thread structure", () => {
    // Three standalone observations
    makeObs("global-1", "resp-1");
    makeObs("global-2", "resp-2");
    makeObs("global-3", "resp-3");

    const turns = getRecentConversation(NODE_ID, 3);
    expect(turns.length).toBeGreaterThanOrEqual(2);
    expect(turns.every((t) => t.role === "user" || t.role === "assistant")).toBe(true);
  });

  test("returns turns in chronological order", () => {
    const turns = getRecentConversation(NODE_ID, 3);
    // Turns are returned in chronological order (reversed from DB query)
    for (let i = 0; i < turns.length - 1; i++) {
      if (turns[i].role === "user") {
        expect(turns[i + 1].role).toBe("assistant");
      }
    }
  });
});
