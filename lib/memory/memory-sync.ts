import type { JarvisBackupPayload } from "@/lib/chat/jarvis-backup";
import {
  cloudSyncFetch,
  readCloudSyncError,
} from "@/lib/chat/cloud-sync-client";

import { exportMemorySnapshot, importMemorySnapshot } from "./memory-backup";

export type MemorySyncPullResult = {
  conversations: JarvisBackupPayload["memory"]["conversations"];
  userProfile: JarvisBackupPayload["memory"]["userProfile"];
};

export async function pullMemoryFromCloud(): Promise<MemorySyncPullResult | null> {
  const response = await cloudSyncFetch("/api/memory/sync", { method: "GET" });

  if (!response) {
    return null;
  }

  if (response.status === 503 || response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readCloudSyncError(response));
  }

  const payload = (await response.json()) as { data?: MemorySyncPullResult };
  return payload.data ?? { conversations: [], userProfile: null };
}

export async function pushMemoryToCloud(conversationIds: string[]): Promise<void> {
  const memory = await exportMemorySnapshot(conversationIds);

  const response = await cloudSyncFetch("/api/memory/sync", {
    method: "POST",
    body: JSON.stringify({ memory }),
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

export async function mergeMemoryFromCloud(remote: MemorySyncPullResult | null): Promise<void> {
  if (!remote || (remote.conversations.length === 0 && !remote.userProfile)) {
    return;
  }

  await importMemorySnapshot({
    conversations: remote.conversations,
    userProfile: remote.userProfile ?? null,
  });
}