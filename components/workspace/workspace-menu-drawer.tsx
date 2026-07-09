"use client"

import type { ComponentType } from "react"
import { useCallback, useEffect, useState } from "react"
import {
  Activity,
  ArrowLeft,
  Brain,
  Download,
  FileText,
  History,
  MessageSquare,
  MessageSquarePlus,
  Settings,
  Trash2,
} from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { formatPercent } from "@/components/workspace/build-metrics"
import type { BuildHistoryRecord } from "@/lib/build-history/build-history-store"
import { listBuildHistory } from "@/lib/build-history/build-history-store"
import { listSessionsSorted, type ChatSession } from "@/lib/chat/chat-sessions"
import { SessionMemoryDrawerView } from "@/components/workspace/session-memory-drawer-view"
import { cn } from "@/lib/utils"

type DrawerView = "main" | "conversations" | "memory" | "history" | "help"

type WorkspaceMenuDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  buildHistoryCount: number
  chatSessions: ChatSession[]
  activeSessionId: string | null
  onNewChat: () => void
  onSelectSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onOpenMemory: (sessionId?: string) => void
  onClearSessionMemory: (sessionId: string) => Promise<void>
  onOpenSettings: () => void
  onExportChat: () => void
  onSelectBuildRecord: (record: BuildHistoryRecord) => void
  onFocusTelemetry: () => void
}

function MenuAction({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  description?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-3 text-left transition-colors hover:border-[#3a3a3a] hover:bg-[#222]"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#262626] text-[#aaa]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-[#ececec]">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[11px] leading-relaxed text-[#777]">{description}</span>
        ) : null}
      </span>
    </button>
  )
}

export function WorkspaceMenuDrawer({
  open,
  onOpenChange,
  buildHistoryCount,
  chatSessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onOpenMemory,
  onClearSessionMemory,
  onOpenSettings,
  onExportChat,
  onSelectBuildRecord,
  onFocusTelemetry,
}: WorkspaceMenuDrawerProps) {
  const [view, setView] = useState<DrawerView>("main")
  const [historyRecords, setHistoryRecords] = useState<BuildHistoryRecord[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const records = await listBuildHistory(50)
      setHistoryRecords(records)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setView("main")
      return
    }
    void loadHistory()
  }, [open, loadHistory])

  const closeAndRun = (action: () => void) => {
    onOpenChange(false)
    action()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-full border-[#2a2a2a] bg-[#141414] text-[#e8e8e8] sm:max-w-sm"
      >
        <SheetHeader className="border-b border-[#2a2a2a] pb-4">
          {view !== "main" ? (
            <button
              type="button"
              onClick={() => setView("main")}
              className="mb-2 inline-flex items-center gap-1 text-[12px] text-[#888] transition-colors hover:text-[#ccc]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Späť
            </button>
          ) : null}
          <SheetTitle className="text-[#f0f0f0]">
            {view === "main" && "Workspace Menu"}
            {view === "conversations" && "Konverzácie"}
            {view === "memory" && "Pamäť konverzácií"}
            {view === "history" && "História buildov"}
            {view === "help" && "Ako to funguje"}
          </SheetTitle>
          <SheetDescription className="text-[#777]">
            {view === "main" && "Navigácia, história, pamäť a export"}
            {view === "conversations" && `${chatSessions.length} uložených konverzácií`}
            {view === "memory" && "Pamäť viazaná na každú konverzáciu samostatne"}
            {view === "history" && `${buildHistoryCount} uložených záznamov (max 50)`}
            {view === "help" && "Planner → Stream → Evaluator → Refine → Preview"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
          {view === "main" ? (
            <div className="space-y-2">
              <MenuAction
                icon={MessageSquarePlus}
                label="Nový chat"
                description="Začne novú konverzáciu — stará zostane v zozname"
                onClick={() => closeAndRun(onNewChat)}
              />
              <MenuAction
                icon={MessageSquare}
                label="Konverzácie"
                description={
                  chatSessions.length > 0
                    ? `${chatSessions.length} uložených chatov`
                    : "Zatiaľ žiadne konverzácie"
                }
                onClick={() => setView("conversations")}
              />
              <MenuAction
                icon={History}
                label="História buildov"
                description={
                  buildHistoryCount > 0
                    ? `${buildHistoryCount} uložených buildov`
                    : "Zatiaľ žiadne buildy"
                }
                onClick={() => setView("history")}
              />
              <MenuAction
                icon={Brain}
                label="Pamäť Jarvisa"
                description="Prehľad pamäte pre každú konverzáciu"
                onClick={() => setView("memory")}
              />
              <MenuAction
                icon={Activity}
                label="Build Trace"
                description="Zobraz telemetry panel aktuálneho buildu"
                onClick={() => closeAndRun(onFocusTelemetry)}
              />
              <MenuAction
                icon={Download}
                label="Export chatu"
                description="Stiahne JSON so všetkými správami"
                onClick={() => closeAndRun(onExportChat)}
              />
              <MenuAction
                icon={Settings}
                label="Nastavenia"
                description="API kľúče pre Mistral, Gemini, OpenAI, Anthropic"
                onClick={() => closeAndRun(onOpenSettings)}
              />
              <MenuAction
                icon={FileText}
                label="Ako to funguje"
                description="Pipeline a fázy buildu"
                onClick={() => setView("help")}
              />
            </div>
          ) : null}

          {view === "conversations" ? (
            <div className="space-y-2">
              {chatSessions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#333] bg-[#1a1a1a] px-3 py-6 text-center text-[12px] text-[#666]">
                  Zatiaľ žiadne konverzácie. Pošli správu alebo začni nový chat.
                </p>
              ) : (
                listSessionsSorted({
                  activeSessionId: activeSessionId ?? "",
                  sessions: chatSessions,
                }).map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "flex items-stretch gap-1 rounded-xl border bg-[#1a1a1a] transition-colors",
                      session.id === activeSessionId
                        ? "border-emerald-900/60 bg-emerald-950/20"
                        : "border-[#2a2a2a] hover:border-[#3a3a3a]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => closeAndRun(() => onSelectSession(session.id))}
                      className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-3 text-left"
                    >
                      <span className="line-clamp-2 text-[13px] font-medium text-[#ececec]">
                        {session.title}
                      </span>
                      <span className="flex flex-wrap items-center gap-2 text-[11px] text-[#777]">
                        <span>{session.messages.length} správ</span>
                        <span>{session.projectName}</span>
                        <span>{new Date(session.updatedAt).toLocaleString()}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSession(session.id)}
                      className="flex shrink-0 items-center justify-center px-2 text-[#666] transition-colors hover:text-red-400"
                      aria-label={`Zmazať konverzáciu ${session.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {view === "memory" ? (
            <SessionMemoryDrawerView
              chatSessions={chatSessions}
              activeSessionId={activeSessionId}
              onOpenSessionMemory={(sessionId) => closeAndRun(() => onOpenMemory(sessionId))}
              onClearSessionMemory={onClearSessionMemory}
            />
          ) : null}

          {view === "history" ? (
            <div className="space-y-2">
              {isLoadingHistory ? (
                <p className="text-[12px] text-[#666]">Načítavam históriu…</p>
              ) : historyRecords.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#333] bg-[#1a1a1a] px-3 py-6 text-center text-[12px] text-[#666]">
                  Zatiaľ žiadne buildy. Pošli prompt a výsledok sa uloží sem.
                </p>
              ) : (
                historyRecords.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => closeAndRun(() => onSelectBuildRecord(record))}
                    className="flex w-full flex-col gap-1 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-3 text-left transition-colors hover:border-[#3a3a3a] hover:bg-[#222]"
                  >
                    <span className="line-clamp-2 text-[13px] font-medium text-[#ececec]">
                      {record.userPrompt}
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-[11px] text-[#777]">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5",
                          record.evaluation.ok
                            ? "bg-emerald-950/50 text-emerald-400"
                            : "bg-red-950/40 text-red-400",
                        )}
                      >
                        {formatPercent(record.evaluation.score, 0)}
                      </span>
                      <span>{record.htmlChars.toLocaleString()} chars</span>
                      <span>{new Date(record.createdAt).toLocaleString()}</span>
                    </span>
                    {record.planSummary ? (
                      <span className="text-[11px] text-[#666]">{record.planSummary}</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          ) : null}

          {view === "help" ? (
            <div className="space-y-3 text-[12px] leading-relaxed text-[#999]">
              <p>
                <strong className="text-[#ccc]">1. Planner</strong> — pred streamom vytvorí JSON plán
                (sekcie, farby, CTA).
              </p>
              <p>
                <strong className="text-[#ccc]">2. Builder</strong> — Mistral stream vygeneruje
                ```html``` artifact.
              </p>
              <p>
                <strong className="text-[#ccc]">3. Evaluator</strong> — lokálna validácia HTML (skóre
                0–1).
              </p>
              <p>
                <strong className="text-[#ccc]">4. Refine</strong> — ak HTML chýba, auto-doplnenie max
                2×.
              </p>
              <p>
                <strong className="text-[#ccc]">5. Preview</strong> — live náhľad + export. História v
                IndexedDB.
              </p>
              <p className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-[11px] text-[#777]">
                Tip: použij ⋯ More options pre rýchle prompty „Dokonči stránku“ alebo „Pridaj script“.
              </p>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}