import { describe, test, expect } from "bun:test";
import { detectExplicitMemoryRequest, detectDeleteRequest } from "../engine/memoryDetection";

describe("detectExplicitMemoryRequest", () => {
  test("returns isMemoryRequest=false for ordinary messages", () => {
    expect(detectExplicitMemoryRequest("how are you?").isMemoryRequest).toBe(false);
    expect(detectExplicitMemoryRequest("what time is it").isMemoryRequest).toBe(false);
    expect(detectExplicitMemoryRequest("I feel anxious today").isMemoryRequest).toBe(false);
    expect(detectExplicitMemoryRequest("").isMemoryRequest).toBe(false);
  });

  test("detects 'remember this' with no content → content=null", () => {
    const r = detectExplicitMemoryRequest("remember this");
    expect(r.isMemoryRequest).toBe(true);
    expect(r.content).toBeNull();
  });

  test("detects 'remember that X' and extracts content", () => {
    const r = detectExplicitMemoryRequest("remember that I am allergic to nuts");
    expect(r.isMemoryRequest).toBe(true);
    expect(r.content).toBe("I am allergic to nuts");
  });

  test("detects 'keep in mind X'", () => {
    const r = detectExplicitMemoryRequest("keep in mind my name is Damon");
    expect(r.isMemoryRequest).toBe(true);
    expect(r.content).toBe("my name is Damon");
  });

  test("detects 'don\\'t forget X'", () => {
    const r = detectExplicitMemoryRequest("don't forget that we meet on Tuesdays");
    expect(r.isMemoryRequest).toBe(true);
    expect(r.content).toBe("that we meet on Tuesdays");
  });

  test("detects 'note that X'", () => {
    const r = detectExplicitMemoryRequest("note that my timezone is UTC-5");
    expect(r.isMemoryRequest).toBe(true);
    expect(r.content).toBe("my timezone is UTC-5");
  });

  test("detects 'save this: X'", () => {
    const r = detectExplicitMemoryRequest("save this: my dog is named Biscuit");
    expect(r.isMemoryRequest).toBe(true);
    expect(r.content).toBe("my dog is named Biscuit");
  });

  test("is case-insensitive", () => {
    expect(detectExplicitMemoryRequest("REMEMBER THIS").isMemoryRequest).toBe(true);
    expect(detectExplicitMemoryRequest("Remember That X is true").content).toBe("X is true");
  });

  test("strips leading whitespace", () => {
    const r = detectExplicitMemoryRequest("  remember my cat is named Pixel");
    expect(r.isMemoryRequest).toBe(true);
    expect(r.content).toBe("my cat is named Pixel");
  });

  test("strips control characters from content", () => {
    detectExplicitMemoryRequest("remember\x00this\x1fvalue");
    // Control chars in the "remember" part of the phrase — should still match
    // but this tests that content stripping works for content portion
    // Use explicit content case:
    const r2 = detectExplicitMemoryRequest("remember that test\x00value");
    expect(r2.content).toBe("test value".replace("\x00", ""));
    // Verify content has no control chars
    if (r2.content) {
      expect(/[\x00-\x1f]/.test(r2.content)).toBe(false);
    }
  });

  test("caps content at 200 characters", () => {
    const longContent = "x".repeat(300);
    const r = detectExplicitMemoryRequest(`remember that ${longContent}`);
    expect(r.isMemoryRequest).toBe(true);
    expect(r.content?.length).toBeLessThanOrEqual(200);
  });
});

describe("detectDeleteRequest", () => {
  test("detects 'delete this'", () => {
    expect(detectDeleteRequest("delete this").isDeleteRequest).toBe(true);
  });

  test("detects 'delete that'", () => {
    expect(detectDeleteRequest("delete that").isDeleteRequest).toBe(true);
  });

  test("detects 'forget this'", () => {
    expect(detectDeleteRequest("forget this").isDeleteRequest).toBe(true);
  });

  test("detects 'forget that'", () => {
    expect(detectDeleteRequest("forget that").isDeleteRequest).toBe(true);
  });

  test("detects 'remove this'", () => {
    expect(detectDeleteRequest("remove this").isDeleteRequest).toBe(true);
  });

  test("detects 'erase that'", () => {
    expect(detectDeleteRequest("erase that").isDeleteRequest).toBe(true);
  });

  test("detects 'please delete this'", () => {
    expect(detectDeleteRequest("please delete this").isDeleteRequest).toBe(true);
  });

  test("detects 'delete my last message'", () => {
    expect(detectDeleteRequest("delete my last message").isDeleteRequest).toBe(true);
  });

  test("detects with trailing punctuation", () => {
    expect(detectDeleteRequest("forget this.").isDeleteRequest).toBe(true);
    expect(detectDeleteRequest("delete that!").isDeleteRequest).toBe(true);
  });

  test("is case-insensitive", () => {
    expect(detectDeleteRequest("DELETE THIS").isDeleteRequest).toBe(true);
    expect(detectDeleteRequest("Forget That").isDeleteRequest).toBe(true);
  });

  test("does NOT match ordinary messages", () => {
    expect(detectDeleteRequest("how are you?").isDeleteRequest).toBe(false);
    expect(detectDeleteRequest("I feel anxious").isDeleteRequest).toBe(false);
    expect(detectDeleteRequest("").isDeleteRequest).toBe(false);
  });

  test("does NOT match 'delete my file' — specific noun prevents match", () => {
    expect(detectDeleteRequest("delete my file").isDeleteRequest).toBe(false);
  });

  test("does NOT match 'forget to buy milk' — infinitive, not pronoun", () => {
    expect(detectDeleteRequest("forget to buy milk").isDeleteRequest).toBe(false);
  });

  test("does NOT match 'please forget I ever said that' — extra content", () => {
    expect(detectDeleteRequest("please forget I ever said that").isDeleteRequest).toBe(false);
  });
});
