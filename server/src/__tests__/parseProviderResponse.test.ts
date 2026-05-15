import { describe, test, expect } from "bun:test";
import { parseProviderResponse } from "../engine/providers/interface";

describe("parseProviderResponse", () => {
  test("parses valid JSON response", () => {
    const raw = JSON.stringify({
      entityResponse: "Hello, I understand.",
      refinedAffect: "resonating",
      refinedArousal: 5,
      refinedValence: "positive",
      refinedEQDomain: "empathy",
      shouldCreateAnchor: false,
    });
    const result = parseProviderResponse(raw, "claude", "claude-test", 100);
    expect(result.entityResponse).toBe("Hello, I understand.");
    expect(result.refinedSignal.suggestedAffect).toBe("resonating");
    expect(result.refinedSignal.arousalLevel).toBe(5);
    expect(result.shouldCreateAnchor).toBe(false);
    expect(result.providerUsed).toBe("claude");
    expect(result.modelUsed).toBe("claude-test");
    expect(result.latencyMs).toBe(100);
  });

  test("strips markdown code fences before parsing", () => {
    const raw = "```json\n{\"entityResponse\":\"Test.\",\"shouldCreateAnchor\":true}\n```";
    const result = parseProviderResponse(raw, "claude", "test", 50);
    expect(result.entityResponse).toBe("Test.");
    expect(result.shouldCreateAnchor).toBe(true);
  });

  test("falls back to raw text slice on malformed JSON", () => {
    const raw = "This is not JSON at all";
    const result = parseProviderResponse(raw, "cloudflare", "llm", 10);
    expect(result.entityResponse).toBe("This is not JSON at all");
    expect(result.shouldCreateAnchor).toBe(false);
    expect(result.refinedSignal).toEqual({});
  });

  test("uses default entityResponse if field missing", () => {
    const raw = JSON.stringify({ shouldCreateAnchor: false });
    const result = parseProviderResponse(raw, "gemini", "g", 10);
    expect(result.entityResponse).toBeTruthy();
  });

  test("shouldCreateAnchor is false unless explicitly true", () => {
    const raw = JSON.stringify({ entityResponse: "x", shouldCreateAnchor: "yes" });
    const result = parseProviderResponse(raw, "openai", "gpt", 10);
    expect(result.shouldCreateAnchor).toBe(false);
  });

  test("handles empty string as fallback", () => {
    const result = parseProviderResponse("", "ollama", "llama", 10);
    expect(result.entityResponse).toBeTruthy();
  });
});
