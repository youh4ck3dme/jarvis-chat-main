import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("Logger", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "info").mockImplementation(() => {})
    vi.spyOn(console, "debug").mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("logs errors in development with a jarvis prefix", async () => {
    process.env = { ...originalEnv, NODE_ENV: "development" }
    const { Logger } = await import("./logger")
    const error = new Error("boom")

    Logger.error("Memory store failed", error)

    expect(console.error).toHaveBeenCalledWith("[jarvis:error]", "Memory store failed", error, undefined)
  })

  it("emits structured JSON errors in production", async () => {
    process.env = { ...originalEnv, NODE_ENV: "production" }
    const { Logger } = await import("./logger")

    Logger.error("Builder unlock API error", new Error("Gateway unavailable"))

    expect(console.error).toHaveBeenCalledOnce()
    const payload = JSON.parse(String((console.error as ReturnType<typeof vi.fn>).mock.calls[0][0]))
    expect(payload).toMatchObject({
      level: "error",
      message: "Builder unlock API error",
      error: {
        name: "Error",
        message: "Gateway unavailable",
      },
    })
    expect(payload.timestamp).toBeTypeOf("string")
  })

  it("logs warnings in development only", async () => {
    process.env = { ...originalEnv, NODE_ENV: "development" }
    const { Logger } = await import("./logger")

    Logger.warn("Falling back to heuristic plan", { route: "build-planner" })

    expect(console.warn).toHaveBeenCalledWith(
      "[jarvis:warn]",
      "Falling back to heuristic plan",
      undefined,
      { route: "build-planner" },
    )
  })

  it("skips info and debug outside development", async () => {
    process.env = { ...originalEnv, NODE_ENV: "production" }
    const { Logger } = await import("./logger")

    Logger.info("noop")
    Logger.debug("noop")

    expect(console.info).not.toHaveBeenCalled()
    expect(console.debug).not.toHaveBeenCalled()
  })
})