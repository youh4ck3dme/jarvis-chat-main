import { z } from "zod";

import type { ChatSession, ChatSessionsState, StoredChatMessage } from "./chat-sessions";
import { DEFAULT_SESSION_TITLE } from "./chat-sessions";
import { normalizeSessionArtifacts } from "./session-artifacts";

export const JARVIS_BACKUP_VERSION = 1 as const;

const storedMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.string(),
  imageData: z.string().optional(),
  attachment: z.string().optional(),
  attachmentName: z.string().optional(),
  narrative: z.boolean().optional(),
});

const sessionArtifactSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  html: z.string(),
  createdAt: z.string(),
});

const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(storedMessageSchema),
  projectName: z.string(),
  updatedAt: z.string(),
  artifacts: z.array(sessionArtifactSchema).optional().default([]),
  activeArtifactId: z.string().nullable().optional().default(null),
});

const sessionsStateSchema = z.object({
  activeSessionId: z.string(),
  sessions: z.array(sessionSchema).min(1),
});

const memoryEntrySchema = z.object({
  id: z.string(),
  type: z.string(),
  content: z.string(),
  metadata: z.object({
    sourceConversationId: z.string().optional(),
    sourceMessageId: z.string().optional(),
    relatedIds: z.array(z.string()),
    tags: z.array(z.string()),
    confidence: z.number(),
  }),
  importance: z.number(),
  lastAccessed: z.string(),
  createdAt: z.string(),
});

const conversationMemorySchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  actionItems: z.array(z.string()),
  unresolvedQuestions: z.array(z.string()),
  entities: z.object({
    people: z.array(z.string()),
    places: z.array(z.string()),
    organizations: z.array(z.string()),
    dates: z.array(z.string()),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const conversationMemoryBundleSchema = z.object({
  conversationId: z.string(),
  entries: z.array(memoryEntrySchema),
  conversationMemory: conversationMemorySchema.nullable(),
});

const userProfileSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  preferences: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const jarvisBackupSchema = z.object({
  version: z.literal(JARVIS_BACKUP_VERSION),
  exportedAt: z.string(),
  syncKey: z.string().optional(),
  sessions: sessionsStateSchema,
  memory: z.object({
    conversations: z.array(conversationMemoryBundleSchema),
    userProfile: userProfileSchema.nullable().optional(),
  }),
});

export type JarvisBackupPayload = z.infer<typeof jarvisBackupSchema>;

export type ConversationMemoryBundle = z.infer<typeof conversationMemoryBundleSchema>;

export function mergeSessionsState(
  local: ChatSessionsState,
  remote: ChatSessionsState,
): ChatSessionsState {
  const merged = new Map<string, ChatSession>();

  for (const session of [...remote.sessions, ...local.sessions]) {
    const existing = merged.get(session.id);
    if (!existing) {
      merged.set(session.id, session);
      continue;
    }

    const existingTime = new Date(existing.updatedAt).getTime();
    const candidateTime = new Date(session.updatedAt).getTime();
    if (candidateTime >= existingTime) {
      merged.set(session.id, session);
    }
  }

  const sessions = [...merged.values()].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );

  const activeSessionId = sessions.some((session) => session.id === local.activeSessionId)
    ? local.activeSessionId
    : sessions[0]?.id ?? local.activeSessionId;

  return { activeSessionId, sessions };
}

export function buildJarvisBackup(input: {
  sessions: ChatSessionsState;
  memory: JarvisBackupPayload["memory"];
  syncKey?: string;
}): JarvisBackupPayload {
  return {
    version: JARVIS_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    syncKey: input.syncKey,
    sessions: input.sessions,
    memory: input.memory,
  };
}

export function parseJarvisBackup(raw: unknown): JarvisBackupPayload {
  return jarvisBackupSchema.parse(raw);
}

export function tryParseJarvisBackup(raw: unknown): JarvisBackupPayload | null {
  const result = jarvisBackupSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function downloadJsonFile(filename: string, payload: unknown): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function normalizeImportedSessionsState(
  sessions: ChatSessionsState,
  fallbackProjectName = "Jarvis",
): ChatSessionsState {
  const normalizedSessions = sessions.sessions.map((session) => {
    const messages = session.messages as StoredChatMessage[];
    const { artifacts, activeArtifactId } = normalizeSessionArtifacts(
      session.artifacts,
      session.activeArtifactId,
    );

    return {
      id: session.id,
      title: session.title?.trim() || DEFAULT_SESSION_TITLE,
      messages,
      projectName: session.projectName?.trim() || fallbackProjectName,
      updatedAt: session.updatedAt || new Date().toISOString(),
      artifacts,
      activeArtifactId,
    };
  });

  const activeSessionId = normalizedSessions.some(
    (session) => session.id === sessions.activeSessionId,
  )
    ? sessions.activeSessionId
    : normalizedSessions[0].id;

  return { activeSessionId, sessions: normalizedSessions };
}