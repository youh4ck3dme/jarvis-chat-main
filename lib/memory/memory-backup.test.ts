import { afterEach, describe, expect, it } from "vitest";

import {
  CHAT_SESSIONS_STORAGE_KEY,
  type ChatSessionsState,
} from "@/lib/chat/chat-sessions";
import { parseJarvisBackup } from "@/lib/chat/jarvis-backup";
import { importFullJarvisBackup } from "@/lib/chat/jarvis-backup-client";
import { getMemoryStore, resetMemoryStoreForTests } from "@/lib/memory/memory-store";

import { exportMemorySnapshot, importMemorySnapshot } from "./memory-backup";

const sessionsState: ChatSessionsState = {
  activeSessionId: "session-a",
  sessions: [
    {
      id: "session-a",
      title: "Káva chat",
      messages: [
        {
          id: "m1",
          role: "user",
          content: "Páči sa mi espresso",
          createdAt: "2026-07-10T10:00:00.000Z",
        },
      ],
      projectName: "Jarvis",
      updatedAt: "2026-07-10T10:00:00.000Z",
      artifacts: [],
      activeArtifactId: null,
    },
  ],
};

describe("memory-backup roundtrip", () => {
  afterEach(() => {
    localStorage.clear();
    resetMemoryStoreForTests();
  });

  it("exports and imports memory for a conversation", async () => {
    const store = getMemoryStore();
    await store.addEntry({
      type: "preference",
      content: "User prefers dark roast coffee",
      metadata: {
        sourceConversationId: "session-a",
        relatedIds: [],
        tags: ["coffee"],
        confidence: 0.9,
      },
      importance: 80,
    });

    const exported = await exportMemorySnapshot(["session-a"]);
    expect(exported.conversations).toHaveLength(1);
    expect(exported.conversations[0]?.entries[0]?.content).toContain("dark roast");

    resetMemoryStoreForTests();
    const freshStore = getMemoryStore();
    await importMemorySnapshot(exported);

    const restored = await freshStore.queryByConversation("session-a");
    expect(restored).toHaveLength(1);
    expect(restored[0]?.content).toContain("dark roast");
  });

  it("simulates export backup in browser A and import in browser B", async () => {
    const browserAState: ChatSessionsState = {
      activeSessionId: "session-browser-b",
      sessions: [
        {
          id: "session-browser-b",
          title: "Export test",
          messages: [
            {
              id: "m-browser",
              role: "user",
              content: "Toto je export test správa",
              createdAt: "2026-07-10T11:00:00.000Z",
            },
          ],
          projectName: "Jarvis",
          updatedAt: "2026-07-10T11:00:00.000Z",
          artifacts: [],
          activeArtifactId: null,
        },
      ],
    };

    const store = getMemoryStore();
    await store.addEntry({
      type: "fact",
      content: "User works on Jarvis project",
      metadata: {
        sourceConversationId: "session-browser-b",
        relatedIds: [],
        tags: ["work"],
        confidence: 0.85,
      },
      importance: 70,
    });

    const memory = await exportMemorySnapshot(["session-browser-b"]);
    const backup = {
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      syncKey: "browser-a-key",
      sessions: browserAState,
      memory,
    };

    localStorage.clear();
    resetMemoryStoreForTests();

    const file = new File([JSON.stringify(backup)], "jarvis-backup.json", {
      type: "application/json",
    });

    const restoredState = await importFullJarvisBackup(file);
    expect(restoredState.sessions[0]?.messages[0]?.content).toContain("export test");
    expect(localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY)).toBeTruthy();

    const parsed = parseJarvisBackup(JSON.parse(await file.text()));
    expect(parsed.syncKey).toBe("browser-a-key");

    const restoredMemory = await getMemoryStore().queryByConversation("session-browser-b");
    expect(restoredMemory[0]?.content).toContain("Jarvis project");
  });
});