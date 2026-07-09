import { getMemoryContextForDisplay } from "@/lib/memory/context-builder";

export type SessionMemorySummary = {
  conversationId: string;
  memoryCount: number;
  lastUpdated: Date | null;
  previewSnippet: string | null;
};

export type SessionMemoryListItem = SessionMemorySummary & {
  title: string;
  isActive: boolean;
};

const PREVIEW_MAX_LEN = 72;

export function truncateMemoryPreview(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length <= PREVIEW_MAX_LEN) return normalized;
  return `${normalized.slice(0, PREVIEW_MAX_LEN)}…`;
}

export async function getSessionMemorySummary(
  conversationId: string,
): Promise<SessionMemorySummary> {
  const context = await getMemoryContextForDisplay(conversationId);
  const memories = [...context.keyFacts, ...context.preferences, ...context.userInfo].sort(
    (left, right) =>
      right.importance - left.importance ||
      right.lastAccessed.getTime() - left.lastAccessed.getTime(),
  );

  const topMemory = memories[0];

  return {
    conversationId,
    memoryCount: context.stats.totalMemories,
    lastUpdated: context.stats.lastUpdated,
    previewSnippet: topMemory ? truncateMemoryPreview(topMemory.content) : null,
  };
}

export async function getSessionMemorySummaries(
  sessions: Array<{ id: string; title: string }>,
  activeSessionId: string | null = null,
): Promise<SessionMemoryListItem[]> {
  const summaries = await Promise.all(
    sessions.map(async (session) => {
      const summary = await getSessionMemorySummary(session.id);
      return {
        ...summary,
        title: session.title,
        isActive: session.id === activeSessionId,
      };
    }),
  );

  return summaries.sort((left, right) => {
    if (left.memoryCount > 0 && right.memoryCount === 0) return -1;
    if (right.memoryCount > 0 && left.memoryCount === 0) return 1;

    const leftTime = left.lastUpdated?.getTime() ?? 0;
    const rightTime = right.lastUpdated?.getTime() ?? 0;
    if (leftTime !== rightTime) return rightTime - leftTime;

    return left.title.localeCompare(right.title, "sk");
  });
}

export function sumSessionMemoryCounts(items: SessionMemoryListItem[]): number {
  return items.reduce((total, item) => total + item.memoryCount, 0);
}