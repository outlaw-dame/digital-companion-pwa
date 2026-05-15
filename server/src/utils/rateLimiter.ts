export function makeRateLimiter(limit: number, windowMs: number) {
  const map = new Map<string, { count: number; windowStart: number }>();
  let nextEvictionAt = Date.now() + windowMs;

  return function check(ip: string): boolean {
    const now = Date.now();
    if (now >= nextEvictionAt) {
      for (const [k, v] of map) {
        if (now - v.windowStart > windowMs) map.delete(k);
      }
      nextEvictionAt = now + windowMs;
    }
    const entry = map.get(ip);
    if (!entry || now - entry.windowStart > windowMs) {
      map.set(ip, { count: 1, windowStart: now });
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count++;
    return true;
  };
}
