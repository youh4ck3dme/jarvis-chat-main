"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, Trash2 } from "lucide-react";

import type { ChatSession } from "@/lib/chat/chat-sessions";
import {
  getSessionMemorySummaries,
  sumSessionMemoryCounts,
  type SessionMemoryListItem,
} from "@/lib/memory/session-memory-summary";
import { cn } from "@/lib/utils";

type SessionMemoryDrawerViewProps = {
  chatSessions: ChatSession[];
  activeSessionId: string | null;
  onOpenSessionMemory: (sessionId: string) => void;
  onClearSessionMemory: (sessionId: string) => Promise<void>;
};

function formatMemoryDate(date: Date | null): string {
  if (!date) return "Bez záznamov";
  return date.toLocaleString("sk-SK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionMemoryDrawerView({
  chatSessions,
  activeSessionId,
  onOpenSessionMemory,
  onClearSessionMemory,
}: SessionMemoryDrawerViewProps) {
  const [items, setItems] = useState<SessionMemoryListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);

  const loadSummaries = useCallback(async () => {
    setIsLoading(true);
    try {
      const summaries = await getSessionMemorySummaries(chatSessions, activeSessionId);
      setItems(summaries);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, chatSessions]);

  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  const handleClear = async (sessionId: string) => {
    setClearingId(sessionId);
    try {
      await onClearSessionMemory(sessionId);
      await loadSummaries();
    } finally {
      setClearingId(null);
    }
  };

  const totalMemories = sumSessionMemoryCounts(items);
  const sessionsWithMemory = items.filter((item) => item.memoryCount > 0).length;

  if (isLoading) {
    return <p className="text-[12px] text-muted-foreground">Načítavam pamäť konverzácií…</p>;
  }

  if (chatSessions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface px-3 py-6 text-center text-[12px] text-muted-foreground">
        Zatiaľ žiadne konverzácie. Pamäť sa viaže na každý chat samostatne.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="session-memory-drawer-view">
      <div className="rounded-xl border border-border bg-surface px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950/40 text-emerald-400">
            <Brain className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13px] font-medium text-fg">
              {totalMemories} záznamov v {sessionsWithMemory} konverzáciách
            </p>
            <p className="text-[11px] text-muted-foreground">
              Každý chat má vlastnú pamäť — fakty a preferencie sa nezmiešavajú.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.conversationId}
            className={cn(
              "flex items-stretch gap-1 rounded-xl border bg-surface transition-colors",
              item.isActive
                ? "border-emerald-900/60 bg-emerald-950/20"
                : "border-border hover:border-border",
            )}
            data-testid={`session-memory-item-${item.conversationId}`}
          >
            <button
              type="button"
              onClick={() => onOpenSessionMemory(item.conversationId)}
              className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-3 text-left"
            >
              <span className="flex items-center gap-2">
                <span className="line-clamp-1 text-[13px] font-medium text-fg">
                  {item.title}
                </span>
                {item.isActive ? (
                  <span className="rounded-full bg-emerald-950/50 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    Aktívna
                  </span>
                ) : null}
              </span>
              <span className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    item.memoryCount > 0
                      ? "bg-emerald-950/40 text-emerald-400"
                      : "bg-surface text-muted-foreground",
                  )}
                >
                  {item.memoryCount} záznamov
                </span>
                <span>{formatMemoryDate(item.lastUpdated)}</span>
              </span>
              {item.previewSnippet ? (
                <span className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {item.previewSnippet}
                </span>
              ) : (
                <span className="text-[11px] italic text-muted-foreground">Zatiaľ bez extrahovanej pamäte</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => void handleClear(item.conversationId)}
              disabled={item.memoryCount === 0 || clearingId === item.conversationId}
              className="flex shrink-0 items-center justify-center px-2 text-muted-foreground transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Vymazať pamäť konverzácie ${item.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}