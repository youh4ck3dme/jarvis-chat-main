import { ApiErrorCode, defaultErrorCodeForStatus, type ApiErrorCode as ApiErrorCodeType } from "./error-codes"

export type ApiErrorBody = {
  success: false
  error: string
  code: ApiErrorCodeType
}

export type ApiSuccessBody<T> = {
  success: true
  data: T
}

export type JsonErrorOptions = {
  code?: ApiErrorCodeType
  extraHeaders?: Record<string, string>
}

export function jsonError(
  error: string,
  status: number,
  options?: JsonErrorOptions,
): Response {
  const code = options?.code ?? defaultErrorCodeForStatus(status)

  return Response.json({ success: false, error, code } satisfies ApiErrorBody, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...options?.extraHeaders,
    },
  })
}

export function jsonSuccess<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data } satisfies ApiSuccessBody<T>, {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export function readApiErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const record = payload as { success?: boolean; error?: unknown }
  if (record.success === false && typeof record.error === "string" && record.error.trim()) {
    return record.error.trim()
  }

  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim()
  }

  return null
}

export function readApiErrorCode(payload: unknown): ApiErrorCodeType | null {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const record = payload as { code?: unknown }
  if (typeof record.code !== "string") {
    return null
  }

  return Object.values(ApiErrorCode).includes(record.code as ApiErrorCodeType)
    ? (record.code as ApiErrorCodeType)
    : null
}