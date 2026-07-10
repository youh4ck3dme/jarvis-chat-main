import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { resetRateLimitStoreForTests } from "@/lib/rate-limit/in-memory-rate-limit"

import { POST } from "./route"

function unlockRequest(
  body: Record<string, unknown>,
  ip = "198.51.100.10",
): Request {
  return new Request("http://localhost/api/builder/unlock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  })
}

describe("POST /api/builder/unlock", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      BUILDER_UNLOCK_PASSWORD: "secret-builder",
      NODE_ENV: "test",
    }
    delete process.env.BUILDER_UNLOCK_RATE_LIMIT_MAX
    delete process.env.BUILDER_UNLOCK_RATE_LIMIT_WINDOW_SEC
    delete process.env.BUILDER_UNLOCK_RATE_LIMIT_DISABLED
    resetRateLimitStoreForTests()
  })

  afterEach(() => {
    process.env = originalEnv
    resetRateLimitStoreForTests()
  })

  it("returns 503 when BUILDER_UNLOCK_PASSWORD is not configured in production", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
    }
    delete process.env.BUILDER_UNLOCK_PASSWORD

    const response = await POST(unlockRequest({ password: "2366" }))

    expect(response.status).toBe(503)
  })

  it("returns 400 when password is missing", async () => {
    const response = await POST(unlockRequest({}))

    expect(response.status).toBe(400)
  })

  it("returns 401 for an invalid password", async () => {
    const response = await POST(unlockRequest({ password: "wrong" }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Nesprávne heslo. Builder režim je chránený.",
    })
  })

  it("returns unlocked=true for the configured password", async () => {
    const response = await POST(unlockRequest({ password: "  secret-builder  " }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { unlocked: true },
    })
  })

  it("returns 429 after too many attempts from the same ip", async () => {
    process.env.BUILDER_UNLOCK_RATE_LIMIT_MAX = "2"
    process.env.BUILDER_UNLOCK_RATE_LIMIT_WINDOW_SEC = "60"

    const first = await POST(unlockRequest({ password: "wrong" }, "203.0.113.77"))
    const second = await POST(unlockRequest({ password: "wrong" }, "203.0.113.77"))
    const third = await POST(unlockRequest({ password: "wrong" }, "203.0.113.77"))

    expect(first.status).toBe(401)
    expect(second.status).toBe(401)
    expect(third.status).toBe(429)
    expect(third.headers.get("Retry-After")).toBeTruthy()
    await expect(third.json()).resolves.toEqual({
      success: false,
      error: "Príliš veľa pokusov o odomknutie. Skús znova neskôr.",
    })
  })
})