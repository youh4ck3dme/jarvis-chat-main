export const ApiErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
} as const

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode]

export function defaultErrorCodeForStatus(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return ApiErrorCode.VALIDATION_ERROR
    case 401:
      return ApiErrorCode.UNAUTHORIZED
    case 429:
      return ApiErrorCode.RATE_LIMITED
    case 503:
      return ApiErrorCode.SERVICE_UNAVAILABLE
    default:
      return ApiErrorCode.INTERNAL_ERROR
  }
}