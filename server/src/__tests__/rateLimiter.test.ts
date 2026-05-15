import { describe, test, expect } from "bun:test";
import { makeRateLimiter } from "../utils/rateLimiter";

describe("makeRateLimiter", () => {
  test("allows requests under the limit", () => {
    const check = makeRateLimiter(3, 60_000);
    expect(check("1.1.1.1")).toBe(true);
    expect(check("1.1.1.1")).toBe(true);
    expect(check("1.1.1.1")).toBe(true);
  });

  test("blocks requests over the limit within the window", () => {
    const check = makeRateLimiter(2, 60_000);
    expect(check("2.2.2.2")).toBe(true);
    expect(check("2.2.2.2")).toBe(true);
    expect(check("2.2.2.2")).toBe(false);
  });

  test("treats different IPs independently", () => {
    const check = makeRateLimiter(1, 60_000);
    expect(check("3.3.3.3")).toBe(true);
    expect(check("4.4.4.4")).toBe(true);
    expect(check("3.3.3.3")).toBe(false);
    expect(check("4.4.4.4")).toBe(false);
  });

  test("resets count after window expires", async () => {
    const check = makeRateLimiter(1, 50); // 50ms window
    expect(check("5.5.5.5")).toBe(true);
    expect(check("5.5.5.5")).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(check("5.5.5.5")).toBe(true);
  });

  test("evicts expired entries on periodic sweep", async () => {
    const check = makeRateLimiter(1, 50);
    // Fill with many unique IPs
    for (let i = 0; i < 10; i++) check(`10.0.0.${i}`);
    await new Promise((r) => setTimeout(r, 60));
    // Trigger eviction via a request after the window expires
    check("10.0.0.99");
    // All should be allowed again (evicted, then reset)
    for (let i = 0; i < 10; i++) {
      expect(check(`10.0.0.${i}`)).toBe(true);
    }
  });
});
