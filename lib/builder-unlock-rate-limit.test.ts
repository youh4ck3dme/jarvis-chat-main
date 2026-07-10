import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  buildBuilderUnlockRateLimitKey,
  checkBuilderUnlockRateLimit,
  resolveBuilderUnlockRateLimitConfig,
} from "./builder-unlock-rate-limit"
import { resetRateLimitStoreForTests } from "./rate-limit/in-memory-rate-limit"

describe("builder-unlock-rate-limit", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.BUILDER_UNLOCK_RATE_LIMIT_DISABLED
    delete process.env.BUILDER_UNLOCK_RATE_LIMIT_MAX
    delete process.env.BUILDER_UNLOCK_RATE_LIMIT_WINDOW_SEC
    resetRateLimitStoreForTests()
  })

  afterEach(() => {
    process.env = originalEnv
    resetRateLimitStoreForTests()
  })

  it("uses default config when env is not set", () => {
    expect(resolveBuilderUnlockRateLimitConfig()).toEqual({
      maxRequests: 10,
      windowMs: 900_000,
    })
  })

  it("builds a scoped key from the client ip", () => {
    const request = new Request("http://localhost/api/builder/unlock", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    })

    expect(buildBuilderUnlockRateLimitKey(request)).toBe("builder-unlock:203.0.113.10")
  })

  it("blocks after the configured max attempts for the same ip", () => {
    process.env.BUILDER_UNLOCK_RATE_LIMIT_MAX = "2"
    process.env.BUILDER_UNLOCK_RATE_LIMIT_WINDOW_SEC = "60"

    const request = new Request("http://localhost/api/builder/unlock", {
      headers: { "x-forwarded-for": "203.0.113.55" },
    })

    expect(checkBuilderUnlockRateLimit(request).allowed).toBe(true)
    expect(checkBuilderUnlockRateLimit(request).allowed).toBe(true)
    expect(checkBuilderUnlockRateLimit(request).allowed).toBe(false)
  })

  it("can be disabled for tests via env flag", () => {
    process.env.BUILDER_UNLOCK_RATE_LIMIT_DISABLED = "true"
    process.env.BUILDER_UNLOCK_RATE_LIMIT_MAX = "1"

    const request = new Request("http://localhost/api/builder/unlock", {
      headers: { "x-forwarded-for": "203.0.113.99" },
    })

    expect(checkBuilderUnlockRateLimit(request).allowed).toBe(true)
    expect(checkBuilderUnlockRateLimit(request).allowed).toBe(true)
  })
})