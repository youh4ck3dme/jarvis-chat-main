import { describe, expect, it } from "vitest"

import { ApiErrorCode } from "./error-codes"
import {
  jsonError,
  jsonSuccess,
  readApiErrorCode,
  readApiErrorMessage,
} from "./api-response"

describe("api-response", () => {
  it("creates unified error and success payloads", async () => {
    const errorResponse = jsonError("Missing API key", 401)
    const successResponse = jsonSuccess({ plan: { summary: "Test" } })

    await expect(errorResponse.json()).resolves.toEqual({
      success: false,
      error: "Missing API key",
      code: ApiErrorCode.UNAUTHORIZED,
    })
    await expect(successResponse.json()).resolves.toEqual({
      success: true,
      data: { plan: { summary: "Test" } },
    })
  })

  it("allows explicit error codes and extra headers", async () => {
    const response = jsonError("Builder unlock is not configured", 503, {
      code: ApiErrorCode.CONFIGURATION_ERROR,
      extraHeaders: { "X-Jarvis-Error": "builder-unlock" },
    })

    expect(response.status).toBe(503)
    expect(response.headers.get("X-Jarvis-Error")).toBe("builder-unlock")
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Builder unlock is not configured",
      code: ApiErrorCode.CONFIGURATION_ERROR,
    })
  })

  it("reads error messages from legacy and unified payloads", () => {
    expect(readApiErrorMessage({ success: false, error: "Planner failed" })).toBe("Planner failed")
    expect(readApiErrorMessage({ error: "Legacy error" })).toBe("Legacy error")
    expect(readApiErrorMessage({ success: true, data: {} })).toBeNull()
  })

  it("reads stable error codes from unified payloads", () => {
    expect(
      readApiErrorCode({
        success: false,
        error: "Nesprávne heslo",
        code: ApiErrorCode.UNAUTHORIZED,
      }),
    ).toBe(ApiErrorCode.UNAUTHORIZED)
    expect(readApiErrorCode({ success: false, error: "Legacy error" })).toBeNull()
    expect(readApiErrorCode({ code: "NOT_A_REAL_CODE" })).toBeNull()
  })
})