import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  getProviderFromModel,
  isProviderAuthError,
  missingApiKeyMessage,
  resolveApiKey,
} from "./resolve-api-key"

describe("resolve-api-key", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("prefers header API key over environment variable", () => {
    process.env.MISTRAL_API_KEY = "env-key"

    expect(resolveApiKey(" header-key ", "mistral")).toBe("header-key")
  })

  it("falls back to provider env vars", () => {
    process.env.GEMINI_API_KEY = "gemini-env"

    expect(resolveApiKey(null, "google")).toBe("gemini-env")
    expect(resolveApiKey("  ", "google")).toBe("gemini-env")
  })

  it("returns empty string when no key is configured", () => {
    delete process.env.MISTRAL_API_KEY

    expect(resolveApiKey(null, "mistral")).toBe("")
  })

  it("maps model prefixes to providers", () => {
    expect(getProviderFromModel("mistral/mistral-small-latest")).toBe("mistral")
    expect(getProviderFromModel("openai/gpt-4o")).toBe("openai")
    expect(getProviderFromModel("unknown/model")).toBeNull()
  })

  it("builds readable missing key messages", () => {
    expect(missingApiKeyMessage("mistral")).toContain("Mistral API key is missing")
    expect(missingApiKeyMessage("mistral")).toContain("MISTRAL_API_KEY")
  })

  it("detects provider auth errors in streamed text", () => {
    expect(isProviderAuthError("Authentication failed for provider")).toBe(true)
    expect(isProviderAuthError("Invalid API key supplied")).toBe(true)
    expect(isProviderAuthError("Everything worked fine")).toBe(false)
  })
})