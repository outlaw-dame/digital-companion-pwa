const RETRYABLE = new Set([429, 500, 502, 503, 504, 529]);

export class ProviderError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly provider: string,
    public readonly retryAfterMs?: number,
  ) {
    super(`${provider} API error (${httpStatus})`);
    this.name = "ProviderError";
  }
}

export function parseRetryAfter(headers: Headers): number | undefined {
  const val = headers.get("retry-after");
  if (!val) return undefined;
  const seconds = parseInt(val, 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 600,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!(err instanceof ProviderError) || !RETRYABLE.has(err.httpStatus)) throw err;
      if (attempt === maxAttempts - 1) throw err;
      const delay = err.retryAfterMs ?? baseDelayMs * (2 ** attempt) + Math.random() * 400;
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
