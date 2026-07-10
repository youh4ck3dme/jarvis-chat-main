import type { ChatSession, ChatSessionsState } from "./chat-sessions";
import {
  cloudSyncFetch,
  fetchCloudSyncStatus,
  readCloudSyncError,
  type CloudSyncStatus,
} from "./cloud-sync-client";
import { mergeSessionsState } from "./jarvis-backup";

export type SessionSyncStatus = CloudSyncStatus;

export type SessionSyncPullResult = {
  sessions: ChatSession[];
};

export type SessionSyncPushInput = {
  sessions: ChatSession[];
  deletedSessionIds?: string[];
};

export async function fetchSessionSyncStatus(): Promise<SessionSyncStatus> {
  return fetchCloudSyncStatus();
}

export async function pullSessionsFromCloud(): Promise<ChatSessionsState | null> {
  const response = await cloudSyncFetch("/api/sessions/sync", { method: "GET" });

  if (!response) {
    return null;
  }

  if (response.status === 503 || response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readCloudSyncError(response));
  }

  const payload = (await response.json()) as {
    data?: SessionSyncPullResult & { activeSessionId?: string };
  };

  const sessions = payload.data?.sessions ?? [];
  if (sessions.length === 0) {
    return null;
  }

  return {
    activeSessionId: payload.data?.activeSessionId ?? sessions[0].id,
    sessions,
  };
}

export async function pushSessionsToCloud(
  state: ChatSessionsState,
  deletedSessionIds: string[] = [],
): Promise<void> {
  const body: SessionSyncPushInput = {
    sessions: state.sessions,
    deletedSessionIds,
  };

  const response = await cloudSyncFetch("/api/sessions/sync", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response) {
    return;
  }

  if (response.status === 503 || response.status === 401) {
    return;
  }

  if (!response.ok) {
    throw new Error(await readCloudSyncError(response));
  }
}

export function mergeLocalWithRemote(
  local: ChatSessionsState,
  remote: ChatSessionsState | null,
): ChatSessionsState {
  if (!remote) return local;
  return mergeSessionsState(local, remote);
}