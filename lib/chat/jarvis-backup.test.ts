import { describe, expect, it } from "vitest";

import type { ChatSessionsState } from "./chat-sessions";
import {
  buildJarvisBackup,
  JARVIS_BACKUP_VERSION,
  mergeSessionsState,
  parseJarvisBackup,
  tryParseJarvisBackup,
} from "./jarvis-backup";

const baseState: ChatSessionsState = {
  activeSessionId: "local-1",
  sessions: [
    {
      id: "local-1",
      title: "Lokálny chat",
      messages: [],
      projectName: "Jarvis",
      updatedAt: "2026-07-10T10:00:00.000Z",
      artifacts: [],
      activeArtifactId: null,
    },
  ],
};

describe("jarvis-backup", () => {
  it("merges sessions by latest updatedAt", () => {
    const remote: ChatSessionsState = {
      activeSessionId: "remote-2",
      sessions: [
        {
          id: "remote-2",
          title: "Cloud chat",
          messages: [{ id: "m1", role: "user", content: "Ahoj", createdAt: "2026-07-10T11:00:00.000Z" }],
          projectName: "Jarvis",
          updatedAt: "2026-07-10T12:00:00.000Z",
          artifacts: [],
          activeArtifactId: null,
        },
        {
          id: "local-1",
          title: "Starý lokálny",
          messages: [],
          projectName: "Jarvis",
          updatedAt: "2026-07-10T09:00:00.000Z",
          artifacts: [],
          activeArtifactId: null,
        },
      ],
    };

    const merged = mergeSessionsState(baseState, remote);

    expect(merged.sessions).toHaveLength(2);
    expect(merged.sessions.find((session) => session.id === "remote-2")?.messages).toHaveLength(1);
    expect(merged.activeSessionId).toBe("local-1");
  });

  it("builds and parses a versioned backup payload", () => {
    const backup = buildJarvisBackup({
      sessions: baseState,
      memory: { conversations: [], userProfile: null },
      syncKey: "device-123",
    });

    expect(backup.version).toBe(JARVIS_BACKUP_VERSION);
    expect(backup.syncKey).toBe("device-123");

    const parsed = parseJarvisBackup(backup);
    expect(parsed.sessions.activeSessionId).toBe("local-1");
    expect(tryParseJarvisBackup({ version: 99 })).toBeNull();
  });
});