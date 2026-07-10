import { afterEach, describe, expect, it, vi } from "vitest"

describe("builder-unlock", () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  it("uses BUILDER_UNLOCK_PASSWORD from server env", async () => {
    process.env = {
      ...originalEnv,
      BUILDER_UNLOCK_PASSWORD: "server-secret",
      NODE_ENV: "production",
    }

    const { resolveBuilderPassword, isBuilderPasswordValid, isBuilderUnlockConfigured } =
      await import("./builder-unlock")
    expect(resolveBuilderPassword()).toBe("server-secret")
    expect(isBuilderUnlockConfigured()).toBe(true)
    expect(isBuilderPasswordValid("server-secret")).toBe(true)
    expect(isBuilderPasswordValid("wrong")).toBe(false)
  })

  it("falls back to dev password in development when env is unset", async () => {
    process.env = { ...originalEnv, NODE_ENV: "development" }
    delete process.env.BUILDER_UNLOCK_PASSWORD

    const { resolveBuilderPassword, DEV_BUILDER_PASSWORD_FALLBACK } = await import("./builder-unlock")
    expect(resolveBuilderPassword()).toBe(DEV_BUILDER_PASSWORD_FALLBACK)
  })

  it("returns null in production when env is unset", async () => {
    process.env = { ...originalEnv, NODE_ENV: "production" }
    delete process.env.BUILDER_UNLOCK_PASSWORD

    const { resolveBuilderPassword, isBuilderUnlockConfigured, isBuilderPasswordValid } =
      await import("./builder-unlock")
    expect(resolveBuilderPassword()).toBeNull()
    expect(isBuilderUnlockConfigured()).toBe(false)
    expect(isBuilderPasswordValid("223513900")).toBe(false)
  })
})