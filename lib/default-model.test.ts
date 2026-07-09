import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { DEFAULT_AI_MODEL, getDefaultAiModel } from "./default-model"

describe("default-model", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("returns public env model first", () => {
    process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL = " mistral/custom-latest "
    process.env.DEFAULT_AI_MODEL = "mistral/other"

    expect(getDefaultAiModel()).toBe("mistral/custom-latest")
  })

  it("falls back to server env model", () => {
    delete process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL
    process.env.DEFAULT_AI_MODEL = " mistral/server-latest "

    expect(getDefaultAiModel()).toBe("mistral/server-latest")
  })

  it("uses hardcoded default when env is empty", () => {
    delete process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL
    delete process.env.DEFAULT_AI_MODEL

    expect(getDefaultAiModel()).toBe(DEFAULT_AI_MODEL)
  })
})