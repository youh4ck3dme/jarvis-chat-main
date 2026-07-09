import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { POST } from "./route"

describe("POST /api/builder/unlock", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      MISTRAL_API_KEY: "test-mistral-key",
      BUILDER_UNLOCK_PASSWORD: "secret-builder",
      NODE_ENV: "test",
    }
  })

  afterEach(() => {
    process.env = originalEnv
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