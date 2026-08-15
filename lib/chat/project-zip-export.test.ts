import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import type { ChatSessionsState } from "./chat-sessions";
import { parseJarvisBackup } from "./jarvis-backup";
import {
  buildProjectZipArchive,
  buildProjectZipFilename,
  slugifyProjectName,
} from "./project-zip-export";

const sessionsState: ChatSessionsState = {
  activeSessionId: "session-1",
  sessions: [
    {
      id: "session-1",
      title: "Kaviareň",
      projectName: "Coffee Shop",
      updatedAt: "2026-07-10T12:00:00.000Z",
      messages: [
        {
          id: "m1",
          role: "assistant",
          content: "```html\n<!doctype html><html><body><h1>Coffee</h1></body></html>\n```",
          createdAt: "2026-07-10T12:00:00.000Z",
        },
      ],
      artifacts: [],
      activeArtifactId: null,
    },
  ],
};

describe("project-zip-export", () => {
  it("slugifies project names for filenames", () => {
    expect(slugifyProjectName("Coffee Shop ☕")).toBe("coffee-shop");
    expect(buildProjectZipFilename("Coffee Shop", new Date("2026-07-10T12:00:00.000Z"))).toBe(
      "jarvis-coffee-shop-2026-07-10.zip",
    );
  });

  it("builds a zip with backup, history, manifest and latest HTML", () => {
    const archive = buildProjectZipArchive({
      sessions: sessionsState,
      memory: { conversations: [], userProfile: null },
      buildHistory: [
        {
          id: "build-1",
          createdAt: "2026-07-10T12:00:00.000Z",
          userPrompt: "landing page",
          evaluation: { ok: true, score: 0.9, issues: [], shouldRefine: false },
          trace: {
            phases: [],
            totalLatencyMs: 1000,
            refinementRounds: 0,
          },
          htmlChars: 120,
          planSummary: "Coffee landing",
        },
      ],
      projectName: "Coffee Shop",
    });

    const entries = unzipSync(archive);
    const names = Object.keys(entries).sort();

    expect(names).toContain("manifest.json");
    expect(names).toContain("backup.json");
    expect(names).toContain("build-history.json");
    expect(names).toContain("latest-build.html");
    expect(names).toContain("latest-build.meta.json");
    expect(names).toContain("README.txt");

    const manifest = JSON.parse(new TextDecoder().decode(entries["manifest.json"])) as {
      hasLatestHtml: boolean;
      buildHistoryCount: number;
    };
    expect(manifest.hasLatestHtml).toBe(true);
    expect(manifest.buildHistoryCount).toBe(1);

    const html = new TextDecoder().decode(entries["latest-build.html"]);
    expect(html).toContain("Coffee");
  });

  it("embeds multi-artifact pages under pages/", () => {
    const multiPageState: ChatSessionsState = {
      activeSessionId: "session-1",
      sessions: [
        {
          id: "session-1",
          title: "Multi site",
          projectName: "Coffee Shop",
          updatedAt: "2026-07-10T12:00:00.000Z",
          messages: [],
          artifacts: [
            {
              id: "a1",
              slug: "index",
              title: "Home",
              html: "<html><body>Home</body></html>",
              createdAt: "2026-07-10T12:00:00.000Z",
            },
            {
              id: "a2",
              slug: "about",
              title: "About",
              html: "<html><body>About</body></html>",
              createdAt: "2026-07-10T12:00:00.000Z",
            },
          ],
          activeArtifactId: "a1",
        },
      ],
    };

    const archive = buildProjectZipArchive({
      sessions: multiPageState,
      memory: { conversations: [], userProfile: null },
      buildHistory: [],
      projectName: "Coffee Shop",
    });

    const entries = unzipSync(archive);
    expect(Object.keys(entries)).toContain("pages/index.html");
    expect(Object.keys(entries)).toContain("pages/about.html");

    const manifest = JSON.parse(new TextDecoder().decode(entries["manifest.json"])) as {
      pages: Array<{ slug: string; file: string }>;
    };
    expect(manifest.pages).toHaveLength(2);
    expect(new TextDecoder().decode(entries["pages/about.html"])).toContain("About");
  });

  it("embeds a backup.json importable via parseJarvisBackup", () => {
    const archive = buildProjectZipArchive({
      sessions: sessionsState,
      memory: { conversations: [], userProfile: null },
      buildHistory: [],
      projectName: "Coffee Shop",
      syncKey: "device-roundtrip",
    });

    const entries = unzipSync(archive);
    const backupRaw = JSON.parse(new TextDecoder().decode(entries["backup.json"]));

    const parsed = parseJarvisBackup(backupRaw);
    expect(parsed.sessions.activeSessionId).toBe("session-1");
    expect(parsed.sessions.sessions[0]?.projectName).toBe("Coffee Shop");
    expect(parsed.syncKey).toBe("device-roundtrip");
  });
});