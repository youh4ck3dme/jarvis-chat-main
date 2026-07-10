import { readApiErrorMessage } from "@/lib/api-response";
import { getOrCreateSyncKey } from "@/lib/chat/sync-key";

import { exportMemorySnapshot, importMemorySnapshot } from "./memory-backup";
import type { JarvisBackupPayload } from "@/lib/chat/jarvis-backup";

export type MemorySyncPullResult = {
  conversations: JarvisBackupPayload["memory"]["conversations"];
  userProfile: JarvisBackupPayload["memory"]["userProfile"];
};

function buildSyncHeaders(syncKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Jarvis-Sync-Key": syncKey,
  };
}

export async function pullMemoryFromCloud(): Promise<MemorySyncPullResult | null> {
  const syncKey = getOrCreateSyncKey();
  const response = await fetch(`/api/memory/sync?syncKey=${encodeURIComponent(syncKey)}`, {
    method: "GET",
    headers: buildSyncHeaders(syncKey),
  });

  if (response.status === 503) {
    return null;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(readApiErrorMessage(payload) ?? "Nepodarilo sa stiahnuť pamäť zo cloudu");
  }

  const payload = (await response.json()) as { data?: MemorySyncPullResult };
  return payload.data ?? { conversations: [], userProfile: null };
}

export async function pushMemoryToCloud(conversationIds: string[]): Promise<void> {
  const syncKey = getOrCreateSyncKey();
  const memory = await exportMemorySnapshot(conversationIds);

  const response = await fetch("/api/memory/sync", {
    method: "POST",
    headers: buildSyncHeaders(syncKey),
    body: JSON.stringify({
      syncKey,
      memory,
    }),
  });

  if (response.status === 503) {
    return;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(readApiErrorMessage(payload) ?? "Nepodarilo sa synchronizovať pamäť do cloudu");
  }
}

export async function mergeMemoryFromCloud(remote: MemorySyncPullResult | null): Promise<void> {
  if (!remote || (remote.conversations.length === 0 && !remote.userProfile)) {
    return;
  }

  await importMemorySnapshot({
    conversations: remote.conversations,
    userProfile: remote.userProfile ?? null,
  });
}