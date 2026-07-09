import { afterEach, describe, expect, it, vi } from "vitest"

describe("lib/env", () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  it("throws when MISTRAL_API_KEY is missing", async () => {
    process.env = { ...originalEnv }
    delete process.env.MISTRAL_API_KEY

    await expect(import("./env")).rejects.toThrow(/Invalid environment configuration/)
  })

  it("parses required and optional variables", async () => {
    process.env = {
      ...originalEnv,
      MISTRAL_API_KEY: " test-key ",
      DEFAULT_AI_MODEL: "mistral/mistral-small-latest",
      NEXT_PUBLIC_DEFAULT_AI_MODEL: "mistral/mistral-small-latest",
      BLOB_READ_WRITE_TOKEN: "blob-token",
      PORT: "3141",
    }

    const { env } = await import("./env")

    expect(env.MISTRAL_API_KEY).toBe("test-key")
    expect(env.DEFAULT_AI_MODEL).toBe("mistral/mistral-small-latest")
    expect(env.NEXT_PUBLIC_DEFAULT_AI_MODEL).toBe("mistral/mistral-small-latest")
    expect(env.BLOB_READ_WRITE_TOKEN).toBe("blob-token")
    expect(env.PORT).toBe("3141")
  })
})