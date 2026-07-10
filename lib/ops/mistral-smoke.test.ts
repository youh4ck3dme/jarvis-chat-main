import { afterEach, describe, expect, it, vi } from "vitest"

import {
  formatMistralSmokeResult,
  resolveMistralSmokeModel,
  shouldRunMistralSmoke,
} from "./mistral-smoke"

describe("mistral-smoke", () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it("skips when MISTRAL_API_KEY is a CI placeholder", () => {
    expect(shouldRunMistralSmoke("ci-placeholder-key")).toBe(false)
    expect(shouldRunMistralSmoke("test-mistral-key")).toBe(false)
  })

  it("runs when a real-looking key is provided", () => {
    expect(shouldRunMistralSmoke("sk-live-mistral-key")).toBe(true)
  })

  it("respects SKIP_MISTRAL_SMOKE", () => {
    process.env.SKIP_MISTRAL_SMOKE = "1"
    expect(shouldRunMistralSmoke("sk-live-mistral-key")).toBe(false)
  })

  it("resolves smoke model from DEFAULT_AI_MODEL", () => {
    process.env.DEFAULT_AI_MODEL = "mistral/mistral-small-latest"
    delete process.env.MISTRAL_SMOKE_MODEL
    expect(resolveMistralSmokeModel()).toBe("mistral-small-latest")
  })

  it("formats skipped and success results", () => {
    expect(formatMistralSmokeResult({ skipped: true, reason: "no key" })).toContain("SKIPPED")
    expect(
      formatMistralSmokeResult({
        skipped: false,
        model: "mistral-small-latest",
        text: "JARVIS_SMOKE_OK",
        latencyMs: 1200,
      }),
    ).toContain("OK")
  })
})