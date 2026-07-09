import { describe, expect, it } from "vitest"

import { jsonError, jsonSuccess, readApiErrorMessage } from "./api-response"

describe("api-response", () => {
  it("creates unified error and success payloads", async () => {
    const errorResponse = jsonError("Missing API key", 401)
    const successResponse = jsonSuccess({ plan: { summary: "Test" } })

    await expect(errorResponse.json()).resolves.toEqual({
      success: false,
      error: "Missing API key",
    })
    await expect(successResponse.json()).resolves.toEqual({
      success: true,
      data: { plan: { summary: "Test" } },
    })
  })

  it("reads error messages from legacy and unified payloads", () => {
    expect(readApiErrorMessage({ success: false, error: "Planner failed" })).toBe("Planner failed")
    expect(readApiErrorMessage({ error: "Legacy error" })).toBe("Legacy error")
    expect(readApiErrorMessage({ success: true, data: {} })).toBeNull()
  })
})