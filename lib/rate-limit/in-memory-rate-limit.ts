export type RateLimitConfig = {
  maxRequests: number
  windowMs: number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterSec: number
}

type RateLimitBucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitBucket>()

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + config.windowMs
    buckets.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: Math.max(config.maxRequests - 1, 0),
      resetAt,
      retryAfterSec: 0,
    }
  }

  if (bucket.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  bucket.count += 1
  return {
    allowed: true,
    remaining: Math.max(config.maxRequests - bucket.count, 0),
    resetAt: bucket.resetAt,
    retryAfterSec: 0,
  }
}

/** Test-only reset between Vitest cases. */
export function resetRateLimitStoreForTests(): void {
  buckets.clear()
}