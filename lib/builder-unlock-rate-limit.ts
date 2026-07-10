import { getClientIp } from "@/lib/rate-limit/client-ip"
import {
  checkRateLimit,
  type RateLimitConfig,
  type RateLimitResult,
} from "@/lib/rate-limit/in-memory-rate-limit"

const DEFAULT_MAX_REQUESTS = 10
const DEFAULT_WINDOW_SEC = 900

export const BUILDER_UNLOCK_RATE_LIMIT_SCOPE = "builder-unlock"

export function resolveBuilderUnlockRateLimitConfig(): RateLimitConfig {
  const max = Number.parseInt(process.env.BUILDER_UNLOCK_RATE_LIMIT_MAX ?? "", 10)
  const windowSec = Number.parseInt(process.env.BUILDER_UNLOCK_RATE_LIMIT_WINDOW_SEC ?? "", 10)

  return {
    maxRequests:
      Number.isFinite(max) && max > 0 ? max : DEFAULT_MAX_REQUESTS,
    windowMs:
      (Number.isFinite(windowSec) && windowSec > 0 ? windowSec : DEFAULT_WINDOW_SEC) * 1000,
  }
}

export function isBuilderUnlockRateLimitDisabled(): boolean {
  return process.env.BUILDER_UNLOCK_RATE_LIMIT_DISABLED === "true"
}

export function buildBuilderUnlockRateLimitKey(request: Request): string {
  return `${BUILDER_UNLOCK_RATE_LIMIT_SCOPE}:${getClientIp(request)}`
}

export function checkBuilderUnlockRateLimit(request: Request): RateLimitResult {
  if (isBuilderUnlockRateLimitDisabled()) {
    return {
      allowed: true,
      remaining: Number.MAX_SAFE_INTEGER,
      resetAt: Date.now(),
      retryAfterSec: 0,
    }
  }

  return checkRateLimit(
    buildBuilderUnlockRateLimitKey(request),
    resolveBuilderUnlockRateLimitConfig(),
  )
}