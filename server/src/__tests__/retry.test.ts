import { describe, test, expect } from "bun:test";
import { ProviderError, withRetry } from "../engine/providers/retry";

describe("ProviderError", () => {
  test("has correct name and properties", () => {
    const err = new ProviderError(429, "claude");
    expect(err.name).toBe("ProviderError");
    expect(err.httpStatus).toBe(429);
    expect(err.provider).toBe("claude");
    expect(err.message).toBe("claude API error (429)");
  });

  test("stores retryAfterMs when provided", () => {
    const err = new ProviderError(429, "claude", 5000);
    expect(err.retryAfterMs).toBe(5000);
  });
});

describe("withRetry", () => {
  test("returns result on first success", async () => {
    const result = await withRetry(async () => "ok");
    expect(result).toBe("ok");
  });

  test("retries on retryable ProviderError then succeeds", async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 3) throw new ProviderError(503, "test");
      return "success";
    }, 3, 1);
    expect(result).toBe("success");
    expect(attempts).toBe(3);
  });

  test("does not retry on non-retryable status (400)", async () => {
    let attempts = 0;
    await expect(
      withRetry(async () => {
        attempts++;
        throw new ProviderError(400, "test");
      }, 3, 1)
    ).rejects.toThrow();
    expect(attempts).toBe(1);
  });

  test("does not retry on non-ProviderError", async () => {
    let attempts = 0;
    await expect(
      withRetry(async () => {
        attempts++;
        throw new TypeError("network failed");
      }, 3, 1)
    ).rejects.toThrow(TypeError);
    expect(attempts).toBe(1);
  });

  test("throws after maxAttempts on persistent retryable error", async () => {
    let attempts = 0;
    await expect(
      withRetry(async () => {
        attempts++;
        throw new ProviderError(503, "test");
      }, 3, 1)
    ).rejects.toBeInstanceOf(ProviderError);
    expect(attempts).toBe(3);
  });

  test("respects retryAfterMs from ProviderError", async () => {
    const start = Date.now();
    let attempts = 0;
    await expect(
      withRetry(async () => {
        attempts++;
        if (attempts === 1) throw new ProviderError(429, "test", 50);
        return "ok";
      }, 3, 1)
    ).resolves.toBe("ok");
    // Should have waited at least 50ms (the retryAfterMs)
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });
});
