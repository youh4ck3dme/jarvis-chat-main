import { exportMemorySnapshot, importMemorySnapshot } from "@/lib/memory/memory-backup";

import type { ChatSessionsState } from "./chat-sessions";
import { persistChatSessionsState } from "./chat-sessions";
import {
  buildJarvisBackup,
  downloadJsonFile,
  normalizeImportedSessionsState,
  parseJarvisBackup,
  tryParseJarvisBackup,
} from "./jarvis-backup";
import { getOrCreateSyncKey } from "./sync-key";

export async function exportFullJarvisBackup(state: ChatSessionsState): Promise<void> {
  const conversationIds = state.sessions.map((session) => session.id);
  const memory = await exportMemorySnapshot(conversationIds);
  const backup = buildJarvisBackup({
    sessions: state,
    memory,
    syncKey: getOrCreateSyncKey(),
  });

  downloadJsonFile(`jarvis-backup-${new Date().toISOString().slice(0, 10)}.json`, backup);
}

export async function importFullJarvisBackup(file: File): Promise<ChatSessionsState> {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;
  const backup = parseJarvisBackup(parsed);
  const normalized = normalizeImportedSessionsState(backup.sessions);

  await importMemorySnapshot(backup.memory);
  persistChatSessionsState(normalized);

  return normalized;
}

export function parseBackupFileText(text: string) {
  const parsed = JSON.parse(text) as unknown;
  return tryParseJarvisBackup(parsed);
}