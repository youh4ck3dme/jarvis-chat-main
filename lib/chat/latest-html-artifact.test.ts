import { describe, expect, it } from "vitest";

import type { ChatSession } from "./chat-sessions";
import { findLatestHtmlArtifact } from "./latest-html-artifact";

const sessions: ChatSession[] = [
  {
    id: "session-old",
    title: "Starý build",
    projectName: "Jarvis",
    updatedAt: "2026-07-09T10:00:00.000Z",
    messages: [
      {
        id: "m1",
        role: "assistant",
        content: "```html\n<!doctype html><html><body><h1>Old</h1></body></html>\n```",
        createdAt: "2026-07-09T10:00:00.000Z",
      },
    ],
  },
  {
    id: "session-new",
    title: "Nový build",
    projectName: "Jarvis",
    updatedAt: "2026-07-10T12:00:00.000Z",
    messages: [
      {
        id: "m2",
        role: "assistant",
        content: "```html\n<!doctype html><html><body><h1>New landing</h1></body></html>\n```",
        createdAt: "2026-07-10T12:00:00.000Z",
      },
    ],
  },
];

describe("findLatestHtmlArtifact", () => {
  it("returns the newest HTML artifact across sessions", () => {
    const latest = findLatestHtmlArtifact(sessions);

    expect(latest).not.toBeNull();
    expect(latest?.sessionId).toBe("session-new");
    expect(latest?.html).toContain("New landing");
  });

  it("returns null when no HTML artifacts exist", () => {
    expect(
      findLatestHtmlArtifact([
        {
          id: "chat-only",
          title: "Chat",
          projectName: "Jarvis",
          updatedAt: "2026-07-10T12:00:00.000Z",
          messages: [
            {
              id: "m1",
              role: "assistant",
              content: "Ahoj, ako ti môžem pomôcť?",
              createdAt: "2026-07-10T12:00:00.000Z",
            },
          ],
        },
      ]),
    ).toBeNull();
  });
});