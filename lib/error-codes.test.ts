import { describe, expect, it } from "vitest"

import { ApiErrorCode, defaultErrorCodeForStatus } from "./error-codes"

describe("error-codes", () => {
  it("maps HTTP status codes to stable API error codes", () => {
    expect(defaultErrorCodeForStatus(400)).toBe(ApiErrorCode.VALIDATION_ERROR)
    expect(defaultErrorCodeForStatus(401)).toBe(ApiErrorCode.UNAUTHORIZED)
    expect(defaultErrorCodeForStatus(429)).toBe(ApiErrorCode.RATE_LIMITED)
    expect(defaultErrorCodeForStatus(503)).toBe(ApiErrorCode.SERVICE_UNAVAILABLE)
    expect(defaultErrorCodeForStatus(500)).toBe(ApiErrorCode.INTERNAL_ERROR)
  })
})