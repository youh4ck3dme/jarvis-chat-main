import { readApiErrorMessage } from "@/lib/api-response";
import { getJarvisAccessToken } from "@/lib/supabase/auth-client";

export type CloudSyncStatus = {
  enabled: boolean;
  authConfigured: boolean;
  authRequired: boolean;
};

export async function fetchCloudSyncStatus(): Promise<CloudSyncStatus> {
  try {
    const response = await fetch("/api/sessions/sync/status", { method: "GET" });
    if (!response.ok) {
      return { enabled: false, authConfigured: false, authRequired: true };
    }

    const payload = (await response.json()) as { data?: CloudSyncStatus };
    return (
      payload.data ?? { enabled: false, authConfigured: false, authRequired: true }
    );
  } catch {
    return { enabled: false, authConfigured: false, authRequired: true };
  }
}

export async function buildCloudSyncHeaders(): Promise<HeadersInit | null> {
  const token = await getJarvisAccessToken();
  if (!token) return null;

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function cloudSyncFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response | null> {
  const headers = await buildCloudSyncHeaders();
  if (!headers) return null;

  return fetch(input, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers ?? {}),
    },
  });
}

export async function readCloudSyncError(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null);
  return readApiErrorMessage(payload) ?? `Cloud sync failed (${response.status})`;
}