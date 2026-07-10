import { afterEach, describe, expect, it } from "vitest"

import { checkRateLimit, resetRateLimitStoreForTests } from "./in-memory-rate-limit"

describe("in-memory-rate-limit", () => {
  afterEach(() => {
    resetRateLimitStoreForTests()
  })

  it("allows requests until the configured max is reached", () => {
    const config = { maxRequests: 3, windowMs: 60_000 }

    expect(checkRateLimit("ip-a", config).allowed).toBe(true)
    expect(checkRateLimit("ip-a", config).allowed).toBe(true)
    expect(checkRateLimit("ip-a", config).allowed).toBe(true)
    expect(checkRateLimit("ip-a", config).allowed).toBe(false)
  })

  it("tracks separate buckets per key", () => {
    const config = { maxRequests: 1, windowMs: 60_000 }

    expect(checkRateLimit("ip-a", config).allowed).toBe(true)
    expect(checkRateLimit("ip-b", config).allowed).toBe(true)
    expect(checkRateLimit("ip-a", config).allowed).toBe(false)
  })

  it("returns retryAfterSec when blocked", () => {
    const config = { maxRequests: 1, windowMs: 30_000 }
    checkRateLimit("ip-a", config)

    const blocked = checkRateLimit("ip-a", config)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSec).toBeGreaterThan(0)
    expect(blocked.remaining).toBe(0)
  })
})