export type ApiErrorBody = {
  success: false
  error: string
}

export type ApiSuccessBody<T> = {
  success: true
  data: T
}

export function jsonError(
  error: string,
  status: number,
  extraHeaders?: Record<string, string>,
): Response {
  return Response.json({ success: false, error } satisfies ApiErrorBody, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
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