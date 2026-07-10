import { strToU8, zipSync } from "fflate";

import type { BuildHistoryRecord } from "@/lib/build-history/build-history-store";

import type { ChatSessionsState } from "./chat-sessions";
import {
  buildJarvisBackup,
  JARVIS_BACKUP_VERSION,
  type JarvisBackupPayload,
} from "./jarvis-backup";
import { findLatestHtmlArtifact, type LatestHtmlArtifact } from "./latest-html-artifact";

export const JARVIS_PROJECT_ZIP_VERSION = 1 as const;

export type JarvisProjectManifest = {
  version: typeof JARVIS_PROJECT_ZIP_VERSION;
  backupVersion: typeof JARVIS_BACKUP_VERSION;
  exportedAt: string;
  projectName: string;
  sessionCount: number;
  memoryConversationCount: number;
  buildHistoryCount: number;
  hasLatestHtml: boolean;
  latestHtml: {
    sessionId: string;
    sessionTitle: string;
    messageId: string;
    createdAt: string;
    htmlChars: number;
  } | null;
  readme: string;
};

export type JarvisProjectZipInput = {
  sessions: ChatSessionsState;
  memory: JarvisBackupPayload["memory"];
  buildHistory: BuildHistoryRecord[];
  projectName: string;
  syncKey?: string;
};

export function slugifyProjectName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "jarvis";
}

export function buildProjectZipFilename(projectName: string, exportedAt = new Date()): string {
  const date = exportedAt.toISOString().slice(0, 10);
  return `jarvis-${slugifyProjectName(projectName)}-${date}.zip`;
}

function buildManifest(input: {
  projectName: string;
  sessions: ChatSessionsState;
  memory: JarvisBackupPayload["memory"];
  buildHistory: BuildHistoryRecord[];
  latestHtml: LatestHtmlArtifact | null;
  exportedAt: string;
}): JarvisProjectManifest {
  const readmeLines = [
    "Jarvis project export",
    `Project: ${input.projectName}`,
    `Exported: ${input.exportedAt}`,
    `Sessions: ${input.sessions.sessions.length}`,
    `Memory bundles: ${input.memory.conversations.length}`,
    `Build history records: ${input.buildHistory.length}`,
    input.latestHtml
      ? `Latest HTML: ${input.latestHtml.sessionTitle} (${input.latestHtml.html.length} chars)`
      : "Latest HTML: none",
    "",
    "Files:",
    "- manifest.json — export metadata",
    "- backup.json — sessions + memory (importable via menu)",
    "- build-history.json — build telemetry metadata",
    "- latest-build.html — newest HTML artifact (if any)",
    "- latest-build.meta.json — source session/message for HTML",
  ];

  return {
    version: JARVIS_PROJECT_ZIP_VERSION,
    backupVersion: JARVIS_BACKUP_VERSION,
    exportedAt: input.exportedAt,
    projectName: input.projectName,
    sessionCount: input.sessions.sessions.length,
    memoryConversationCount: input.memory.conversations.length,
    buildHistoryCount: input.buildHistory.length,
    hasLatestHtml: Boolean(input.latestHtml),
    latestHtml: input.latestHtml
      ? {
          sessionId: input.latestHtml.sessionId,
          sessionTitle: input.latestHtml.sessionTitle,
          messageId: input.latestHtml.messageId,
          createdAt: input.latestHtml.createdAt,
          htmlChars: input.latestHtml.html.length,
        }
      : null,
    readme: readmeLines.join("\n"),
  };
}

export function buildProjectZipArchive(input: JarvisProjectZipInput): Uint8Array {
  const exportedAt = new Date().toISOString();
  const backup = buildJarvisBackup({
    sessions: input.sessions,
    memory: input.memory,
    syncKey: input.syncKey,
  });
  const latestHtml = findLatestHtmlArtifact(input.sessions.sessions);
  const manifest = buildManifest({
    projectName: input.projectName,
    sessions: input.sessions,
    memory: input.memory,
    buildHistory: input.buildHistory,
    latestHtml,
    exportedAt,
  });

  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
    "backup.json": strToU8(JSON.stringify(backup, null, 2)),
    "build-history.json": strToU8(JSON.stringify(input.buildHistory, null, 2)),
    "README.txt": strToU8(manifest.readme),
  };

  if (latestHtml) {
    files["latest-build.html"] = strToU8(latestHtml.html);
    files["latest-build.meta.json"] = strToU8(
      JSON.stringify(
        {
          sessionId: latestHtml.sessionId,
          sessionTitle: latestHtml.sessionTitle,
          messageId: latestHtml.messageId,
          createdAt: latestHtml.createdAt,
          htmlChars: latestHtml.html.length,
        },
        null,
        2,
      ),
    );
  }

  return zipSync(files);
}

export function downloadZipArchive(filename: string, archive: Uint8Array): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([archive], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}