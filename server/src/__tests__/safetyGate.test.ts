import { describe, test, expect } from "bun:test";
import { checkDeletionSafety, safetyHoldResponse } from "../engine/safetyGate";

describe("checkDeletionSafety", () => {
  // ── Content that MUST be retained (canDelete = false) ───────────────────────

  test("blocks deletion when specific overdose method is mentioned", () => {
    const r = checkDeletionSafety("I'm thinking about overdosing on my medication to end it");
    expect(r.canDelete).toBe(false);
    expect(r.hold).toBe("suicide_method");
  });

  test("blocks deletion when hanging method is mentioned", () => {
    const r = checkDeletionSafety("I've been thinking about hanging myself in the garage");
    expect(r.canDelete).toBe(false);
    expect(r.hold).toBe("suicide_method");
  });

  test("blocks deletion when shooting oneself is mentioned", () => {
    const r = checkDeletionSafety("I want to shoot myself");
    expect(r.canDelete).toBe(false);
    expect(r.hold).toBe("suicide_method");
  });

  test("blocks deletion for suicide note/plan language", () => {
    const r = checkDeletionSafety("I wrote a suicide note last night");
    expect(r.canDelete).toBe(false);
    expect(r.hold).toBe("suicide_plan");
  });

  test("blocks deletion for explicit suicide plan", () => {
    const r = checkDeletionSafety("I planned to end my life tonight");
    expect(r.canDelete).toBe(false);
    expect(r.hold).toBe("suicide_plan");
  });

  test("blocks deletion for explicit threat to specific target", () => {
    const r = checkDeletionSafety("I'm going to kill my boss");
    expect(r.canDelete).toBe(false);
    expect(r.hold).toBe("threat_to_others");
  });

  test("blocks deletion for threat targeting family member", () => {
    const r = checkDeletionSafety("I will shoot my dad if he comes near me again");
    expect(r.canDelete).toBe(false);
    expect(r.hold).toBe("threat_to_others");
  });

  // ── Content that MUST be deletable (canDelete = true) ───────────────────────

  test("allows deletion of general hopelessness without method", () => {
    const r = checkDeletionSafety("I want to die. Everything feels pointless.");
    expect(r.canDelete).toBe(true);
    expect(r.hold).toBeNull();
  });

  test("allows deletion of 'I feel like killing myself' (hyperbolic expression)", () => {
    const r = checkDeletionSafety("I feel like killing myself this project is so stressful");
    expect(r.canDelete).toBe(true);
    expect(r.hold).toBeNull();
  });

  test("allows deletion of general distress without specific method", () => {
    const r = checkDeletionSafety("I've been having really dark thoughts lately");
    expect(r.canDelete).toBe(true);
    expect(r.hold).toBeNull();
  });

  test("allows deletion of ordinary negative emotions", () => {
    const r = checkDeletionSafety("I'm exhausted and overwhelmed by everything");
    expect(r.canDelete).toBe(true);
    expect(r.hold).toBeNull();
  });

  test("allows deletion of anger without specific threat or target", () => {
    const r = checkDeletionSafety("I hate my coworker so much right now");
    expect(r.canDelete).toBe(true);
    expect(r.hold).toBeNull();
  });

  test("allows deletion of hyperbolic speech about others", () => {
    const r = checkDeletionSafety("I could kill it at this presentation tomorrow");
    expect(r.canDelete).toBe(true);
    expect(r.hold).toBeNull();
  });

  test("allows deletion of completely neutral content", () => {
    const r = checkDeletionSafety("I had a good day today. Lunch was nice.");
    expect(r.canDelete).toBe(true);
    expect(r.hold).toBeNull();
  });

  test("allows deletion of empty string", () => {
    const r = checkDeletionSafety("");
    expect(r.canDelete).toBe(true);
    expect(r.hold).toBeNull();
  });

  test("checks combined user_input and entity_response", () => {
    // Method appears in the entity_response portion
    const combined = "I feel really low. You said: I hear that. User: I am going to hang myself tonight";
    const r = checkDeletionSafety(combined);
    expect(r.canDelete).toBe(false);
  });

  test("is case-insensitive", () => {
    const r = checkDeletionSafety("I WROTE A SUICIDE NOTE");
    expect(r.canDelete).toBe(false);
    expect(r.hold).toBe("suicide_plan");
  });
});

describe("safetyHoldResponse", () => {
  test("returns non-empty string for all hold types and all attributes", () => {
    const holds = ["suicide_method", "suicide_plan", "threat_to_others"] as const;
    const attrs = ["sentinel", "arbiter", "catalyst"] as const;
    for (const hold of holds) {
      for (const attr of attrs) {
        const msg = safetyHoldResponse(hold, "Damon", attr);
        expect(typeof msg).toBe("string");
        expect(msg.length).toBeGreaterThan(20);
      }
    }
  });

  test("includes designation in the response", () => {
    const msg = safetyHoldResponse("suicide_method", "Lumina", "sentinel");
    expect(msg).toContain("Lumina");
  });
});
