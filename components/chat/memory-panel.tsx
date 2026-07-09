"use client"

import { useCallback, useEffect, useState } from "react"
import { Brain, Search, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useMemory } from "@/hooks/use-memory"
import type { MemoryEntry, MemoryType } from "@/lib/memory/types"
import { cn } from "@/lib/utils"

interface MemoryPanelProps {
  conversationId: string
  sessionTitle?: string | null
  isOpen: boolean
  onClose: () => void
}

const MEMORY_FILTERS: { id: MemoryType | "all"; label: string }[] = [
  { id: "all", label: "Všetko" },
  { id: "user_info", label: "Info" },
  { id: "preference", label: "Preferencie" },
  { id: "fact", label: "Fakty" },
  { id: "question", label: "Otázky" },
  { id: "persona", label: "Ľudia" },
  { id: "context", label: "Kontext" },
]

const MEMORY_TYPE_STYLES: Record<MemoryType, { badge: string; card: string }> = {
  user_info: {
    badge: "bg-emerald-950/60 text-emerald-400 border-emerald-900/50",
    card: "border-emerald-900/30 bg-emerald-950/20",
  },
  preference: {
    badge: "bg-purple-950/60 text-purple-400 border-purple-900/50",
    card: "border-purple-900/30 bg-purple-950/20",
  },
  fact: {
    badge: "bg-sky-950/60 text-sky-400 border-sky-900/50",
    card: "border-sky-900/30 bg-sky-950/20",
  },
  question: {
    badge: "bg-amber-950/60 text-amber-400 border-amber-900/50",
    card: "border-amber-900/30 bg-amber-950/20",
  },
  persona: {
    badge: "bg-pink-950/60 text-pink-400 border-pink-900/50",
    card: "border-pink-900/30 bg-pink-950/20",
  },
  context: {
    badge: "bg-[#2a2a2a] text-[#aaa] border-[#333]",
    card: "border-[#2a2a2a] bg-[#1a1a1a]",
  },
  summarization: {
    badge: "bg-indigo-950/60 text-indigo-400 border-indigo-900/50",
    card: "border-indigo-900/30 bg-indigo-950/20",
  },
}

const TYPE_LABELS: Record<MemoryType, string> = {
  user_info: "User Info",
  preference: "Preferencie",
  fact: "Fakty",
  question: "Otázky",
  persona: "Ľudia",
  context: "Kontext",
  summarization: "Súhrn",
}

export function MemoryPanel({ conversationId, sessionTitle, isOpen, onClose }: MemoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<MemoryType | "all">("all")
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(false)

  const { getMemoryContext, clearConversationMemory, deleteEntry: deleteMemoryEntry } = useMemory()

  const [memoryData, setMemoryData] = useState<{
    keyFacts: MemoryEntry[]
    preferences: MemoryEntry[]
    userInfo: MemoryEntry[]
    stats: {
      totalMemories: number
      lastUpdated: Date | null
    }
  }>({
    keyFacts: [],
    preferences: [],
    userInfo: [],
    stats: { totalMemories: 0, lastUpdated: null },
  })

  const loadMemoryData = useCallback(async () => {
    if (!isOpen || !conversationId) return

    setIsLoading(true)
    try {
      const context = await getMemoryContext(conversationId)
      setMemoryData(context)
    } catch (error) {
      console.error("Failed to load memory data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, getMemoryContext, isOpen])

  useEffect(() => {
    if (isOpen) {
      void loadMemoryData()
    }
  }, [isOpen, loadMemoryData])

  const getAllMemories = useCallback((): MemoryEntry[] => {
    return [...memoryData.keyFacts, ...memoryData.preferences, ...memoryData.userInfo].sort(
      (left, right) =>
        right.importance - left.importance || right.lastAccessed.getTime() - left.lastAccessed.getTime(),
    )
  }, [memoryData])

  const filteredMemories = useCallback((): MemoryEntry[] => {
    let filtered = getAllMemories()

    if (selectedType !== "all") {
      filtered = filtered.filter((entry) => entry.type === selectedType)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      filtered = filtered.filter(
        (entry) =>
          entry.content.toLowerCase().includes(query) ||
          entry.metadata.tags.some((tag) => tag.toLowerCase().includes(query)),
      )
    }

    return filtered
  }, [getAllMemories, searchQuery, selectedType])

  const handleDeleteEntry = useCallback(
    async (id: string) => {
      try {
        await deleteMemoryEntry(id)
        await loadMemoryData()
      } catch (error) {
        console.error("Failed to delete memory entry:", error)
      }
    },
    [deleteMemoryEntry, loadMemoryData],
  )

  const handleClearAll = useCallback(async () => {
    try {
      await clearConversationMemory(conversationId)
      await loadMemoryData()
    } catch (error) {
      console.error("Failed to clear conversation memory:", error)
    }
  }, [clearConversationMemory, conversationId, loadMemoryData])

  const formatDate = (date: Date): string =>
    date.toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const memories = filteredMemories()

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col border-[#2a2a2a] bg-[#141414] p-0 text-[#e8e8e8] sm:max-w-md [&>button]:rounded-lg [&>button]:border [&>button]:border-[#2a2a2a] [&>button]:bg-[#1a1a1a] [&>button]:text-[#888] [&>button]:opacity-100 [&>button]:hover:bg-[#222] [&>button]:hover:text-[#ddd]"
      >
        <SheetHeader className="border-b border-[#2a2a2a] px-4 py-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-emerald-400">
                <Brain className="h-4 w-4" />
              </span>
              <div>
                <SheetTitle className="text-[15px] text-[#f0f0f0]">Pamäť Jarvisa</SheetTitle>
                <SheetDescription className="text-[12px] text-[#777]">
                  {sessionTitle
                    ? `Konverzácia: ${sessionTitle} · lokálne v prehliadači`
                    : "Dlhodobý kontext konverzácie (lokálne v prehliadači)"}
                </SheetDescription>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="border-b border-[#2a2a2a] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[#666]">Záznamov</p>
              <p className="text-2xl font-semibold text-[#f0f0f0]">{memoryData.stats.totalMemories}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-[#666]">Aktualizované</p>
              <p className="text-[12px] font-medium text-[#aaa]">
                {memoryData.stats.lastUpdated ? formatDate(memoryData.stats.lastUpdated) : "Nikdy"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-b border-[#2a2a2a] px-4 py-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
              <input
                type="text"
                placeholder="Hľadať v pamäti…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-9 w-full rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] pl-9 pr-3 text-[13px] text-[#ececec] placeholder:text-[#666] focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
            <Button
              onClick={() => void handleClearAll()}
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-[#888] hover:border-red-900/50 hover:bg-red-950/30 hover:text-red-400"
              aria-label="Vymazať celú pamäť"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {MEMORY_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setSelectedType(filter.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  selectedType === filter.id
                    ? "border-[#3a3a3a] bg-[#222] text-[#f0f0f0]"
                    : "border-[#2a2a2a] bg-[#1a1a1a] text-[#777] hover:border-[#333] hover:text-[#bbb]",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#333] border-t-emerald-500" />
            </div>
          ) : memories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#333] bg-[#1a1a1a] px-4 py-10 text-center">
              <p className="text-[13px] font-medium text-[#aaa]">
                {searchQuery ? "Žiadne zhody vo vyhľadávaní" : "Zatiaľ žiadna pamäť"}
              </p>
              <p className="mt-1 text-[12px] text-[#666]">
                Po rozhovore sa tu objavia fakty, preferencie a kontext.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 pb-4">
              {memories.map((memory) => {
                const styles = MEMORY_TYPE_STYLES[memory.type] ?? MEMORY_TYPE_STYLES.fact
                const isExpanded = expandedIds[memory.id]

                return (
                  <div
                    key={memory.id}
                    className={cn("rounded-xl border px-3 py-3", styles.card)}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          styles.badge,
                        )}
                      >
                        {TYPE_LABELS[memory.type]}
                      </span>
                      <span className="text-[10px] text-[#666]">{memory.importance}% dôležitosť</span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedIds((prev) => ({ ...prev, [memory.id]: !prev[memory.id] }))
                      }
                      className="w-full text-left"
                    >
                      <p
                        className={cn(
                          "text-[13px] leading-relaxed text-[#ddd]",
                          !isExpanded && "line-clamp-2",
                        )}
                      >
                        {memory.content}
                      </p>
                    </button>

                    {isExpanded ? (
                      <div className="mt-2 border-t border-[#2a2a2a]/80 pt-2">
                        <p className="text-[11px] text-[#777]">
                          {formatDate(memory.createdAt)} · Istota{" "}
                          {Math.round(memory.metadata.confidence * 100)}%
                        </p>
                        {memory.metadata.tags.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {memory.metadata.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-[#333] bg-[#1a1a1a] px-2 py-0.5 text-[10px] text-[#888]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleDeleteEntry(memory.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[#777] transition-colors hover:bg-red-950/30 hover:text-red-400"
                        aria-label="Zmazať záznam"
                      >
                        <Trash2 className="h-3 w-3" />
                        Zmazať
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-[#2a2a2a] px-4 py-3">
          <p className="text-center text-[11px] text-[#666]">
            Pamäť je uložená lokálne — neodosiela sa na server.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default MemoryPanel