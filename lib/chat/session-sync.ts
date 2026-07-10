import { readApiErrorMessage } from "@/lib/api-response";

import type { ChatSession, ChatSessionsState } from "./chat-sessions";
import { mergeSessionsState } from "./jarvis-backup";
import { getOrCreateSyncKey } from "./sync-key";

export type SessionSyncStatus = {
  enabled: boolean;
};

export type SessionSyncPullResult = {
  sessions: ChatSession[];
};

export type SessionSyncPushInput = {
  syncKey: string;
  sessions: ChatSession[];
  deletedSessionIds?: string[];
};

function buildSyncHeaders(syncKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Jarvis-Sync-Key": syncKey,
  };
}

export async function fetchSessionSyncStatus(): Promise<SessionSyncStatus> {
  try {
    const response = await fetch("/api/sessions/sync/status", { method: "GET" });
    if (!response.ok) {
      return { enabled: false };
    }

    const payload = (await response.json()) as { data?: SessionSyncStatus };
    return payload.data ?? { enabled: false };
  } catch {
    return { enabled: false };
  }
}

export async function pullSessionsFromCloud(): Promise<ChatSessionsState | null> {
  const syncKey = getOrCreateSyncKey();
  const response = await fetch(`/api/sessions/sync?syncKey=${encodeURIComponent(syncKey)}`, {
    method: "GET",
    headers: buildSyncHeaders(syncKey),
  });

  if (response.status === 503) {
    return null;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(readApiErrorMessage(payload) ?? "Nepodarilo sa stiahnuť sessions zo cloudu");
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
  const syncKey = getOrCreateSyncKey();
  const body: SessionSyncPushInput = {
    syncKey,
    sessions: state.sessions,
    deletedSessionIds,
  };

  const response = await fetch("/api/sessions/sync", {
    method: "POST",
    headers: buildSyncHeaders(syncKey),
    body: JSON.stringify(body),
  });

  if (response.status === 503) {
    return;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(readApiErrorMessage(payload) ?? "Nepodarilo sa synchronizovať sessions do cloudu");
  }
}

export function mergeLocalWithRemote(
  local: ChatSessionsState,
  remote: ChatSessionsState | null,
): ChatSessionsState {
  if (!remote) return local;
  return mergeSessionsState(local, remote);
}