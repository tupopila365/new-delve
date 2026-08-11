/** Simple sliding-window rate limiter (in-memory). Fine for single-dyno Day 2. */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec: number; remaining: number } {
  const now = Date.now()
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSec: 0, remaining: limit - 1 }
  }
  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    }
  }
  existing.count += 1
  return { ok: true, retryAfterSec: 0, remaining: Math.max(0, limit - existing.count) }
}
/** Test helper — clears in-memory buckets. */
export function resetRateLimits() {
  buckets.clear()
}
