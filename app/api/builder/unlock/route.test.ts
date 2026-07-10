import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { POST } from "./route"

describe("POST /api/builder/unlock", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      BUILDER_UNLOCK_PASSWORD: "secret-builder",
      NODE_ENV: "test",
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("returns 503 when BUILDER_UNLOCK_PASSWORD is not configured in production", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
    }
    delete process.env.BUILDER_UNLOCK_PASSWORD

    const response = await POST(
      new Request("http://localhost/api/builder/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "2366" }),
      }),
    )

    expect(response.status).toBe(503)
  })

  it("returns 400 when password is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/builder/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    )

    expect(response.status).toBe(400)
  })

  it("returns 401 for an invalid password", async () => {
    const response = await POST(
      new Request("http://localhost/api/builder/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "wrong" }),
      }),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Nesprávne heslo. Builder režim je chránený.",
    })
  })

  it("returns unlocked=true for the configured password", async () => {
    const response = await POST(
      new Request("http://localhost/api/builder/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "  secret-builder  " }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { unlocked: true },
    })
  })
})