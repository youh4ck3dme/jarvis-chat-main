"use client"

import type { ComponentType } from "react"
import { useCallback, useEffect, useState } from "react"
import {
  Activity,
  ArrowLeft,
  Brain,
  Cloud,
  Download,
  FileArchive,
  FileText,
  History,
  MessageSquare,
  MessageSquarePlus,
  Settings,
  Trash2,
  Upload,
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
import { JarvisAuthPanel } from "@/components/workspace/jarvis-auth-panel"
import { DesktopAgentBadge } from "@/components/workspace/desktop-agent-badge"
import { DesktopAgentProvider } from "@/lib/desktop-agent/desktop-agent-context"
import { DesktopVoicePanel } from "@/components/workspace/desktop-voice-panel"
import { DesktopAuthExport } from "@/components/workspace/desktop-auth-export"
import { SessionMemoryDrawerView } from "@/components/workspace/session-memory-drawer-view"
import { cn } from "@/lib/utils"
import { User } from "lucide-react"
import { ProfileSettingsView } from "@/components/profile/profile-settings-view"

type DrawerView = "main" | "conversations" | "memory" | "history" | "help" | "profile"

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
  onExportFullBackup: () => void | Promise<void>
  onExportProjectZip: () => void | Promise<void>
  onImportBackup: (file: File) => void | Promise<void>
  cloudSyncEnabled?: boolean
  cloudAuthConfigured?: boolean
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
      className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-left transition-colors hover:border-border hover:bg-surface"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-subtle">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-fg">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{description}</span>
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
  onExportFullBackup,
  onExportProjectZip,
  onImportBackup,
  cloudSyncEnabled = false,
  cloudAuthConfigured = false,
  onSelectBuildRecord,
  onFocusTelemetry,
}: WorkspaceMenuDrawerProps) {
  const [view, setView] = useState<DrawerView>("main")
  const [historyRecords, setHistoryRecords] = useState<BuildHistoryRecord[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const records = await listBuildHistory({
        sessionId: activeSessionId ?? undefined,
        limit: 50,
      })
      setHistoryRecords(records)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [activeSessionId])

  useEffect(() => {
    if (!open) {
      setView("main")
      return
    }
    void loadHistory()
  }, [open, loadHistory, activeSessionId])

  const closeAndRun = (action: () => void) => {
    onOpenChange(false)
    action()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-full border-border bg-background p-0 text-fg sm:max-w-sm"
      >
        <div className="animate-slide-right flex min-h-0 flex-1 flex-col gap-4 p-4">
        <SheetHeader className="border-b border-border pb-4">
          {view !== "main" ? (
            <button
              type="button"
              onClick={() => setView("main")}
              className="mb-2 inline-flex items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-fg/80"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Späť
            </button>
          ) : null}
          <SheetTitle className="text-fg">
            {view === "main" && "Workspace Menu"}
            {view === "conversations" && "Konverzácie"}
            {view === "memory" && "Pamäť konverzácií"}
            {view === "history" && "História buildov"}
            {view === "help" && "Ako to funguje"}
            {view === "profile" && "User Profile"}
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            {view === "main" && "Navigácia, história, pamäť a export"}
            {view === "conversations" && `${chatSessions.length} uložených konverzácií`}
            {view === "memory" && "Pamäť viazaná na každú konverzáciu samostatne"}
            {view === "history" &&
              `${buildHistoryCount} buildov v tejto konverzácii (max 50 na chat)`}
            {view === "help" && "Planner → Stream → Evaluator → Refine → Preview"}
            {view === "profile" && "Customize your profile and avatar"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2">
          {view === "main" ? (
            <div className="space-y-2">
              <MenuAction
                icon={MessageSquarePlus}
                label="Nový chat"
                description="Nová konverzácia — pamäť a buildy ostávajú v pôvodnom chate"
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
                    ? `${buildHistoryCount} buildov v aktuálnom chate`
                    : "Buildy viazané na aktuálnu konverzáciu"
                }
                onClick={() => setView("history")}
              />
              <MenuAction
                icon={Brain}
                label="Pamäť Jarvisa"
                description="Pamäť je per konverzácia — nový chat ju nemaže"
                onClick={() => setView("memory")}
              />
              <MenuAction
                icon={User}
                label="My Profile"
                description="Customize avatar, name, and account settings"
                onClick={() => setView("profile")}
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
                description="Stiahne JSON aktuálnej konverzácie"
                onClick={() => closeAndRun(onExportChat)}
              />
              <MenuAction
                icon={Download}
                label="Export backup"
                description="Všetky konverzácie + pamäť Jarvisa (JSON)"
                onClick={() => closeAndRun(() => void onExportFullBackup())}
              />
              <MenuAction
                icon={FileArchive}
                label="Export projektu (ZIP)"
                description="Sessions + pamäť + build history + posledný HTML"
                onClick={() => closeAndRun(() => void onExportProjectZip())}
              />
              <label className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-left transition-colors hover:border-border hover:bg-surface">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-subtle">
                  <Upload className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-fg">Import backup</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                    Obnoví konverzácie a pamäť z JSON súboru
                  </span>
                </span>
                <input
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ""
                    if (!file) return
                    closeAndRun(() => void onImportBackup(file))
                  }}
                />
              </label>
              {cloudSyncEnabled ? (
                <div className="space-y-2" data-testid="cloud-sync-section">
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-surface px-3 py-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-subtle">
                      <Cloud className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-fg">
                        Cloud sync
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                        Prihlás sa — sessions aj pamäť sa syncujú pod jedným účtom
                      </span>
                    </span>
                  </div>
                  <JarvisAuthPanel authConfigured={cloudAuthConfigured} />
                  <DesktopAuthExport />
                  <DesktopAgentProvider>
                    <div className="pt-1">
                      <DesktopAgentBadge />
                    </div>
                    <div className="pt-2">
                      <DesktopVoicePanel />
                    </div>
                  </DesktopAgentProvider>
                </div>
              ) : null}
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
                <p className="rounded-xl border border-dashed border-border bg-surface px-3 py-6 text-center text-[12px] text-muted-foreground">
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
                      "flex items-stretch gap-1 rounded-xl border bg-surface transition-colors",
                      session.id === activeSessionId
                        ? "border-emerald-900/60 bg-emerald-950/20"
                        : "border-border hover:border-border",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => closeAndRun(() => onSelectSession(session.id))}
                      className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-3 text-left"
                    >
                      <span className="line-clamp-2 text-[13px] font-medium text-fg">
                        {session.title}
                      </span>
                      <span className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{session.messages.length} správ</span>
                        <span>{session.projectName}</span>
                        <span>{new Date(session.updatedAt).toLocaleString()}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSession(session.id)}
                      className="flex shrink-0 items-center justify-center px-2 text-muted-foreground transition-colors hover:text-red-400"
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
                <p className="text-[12px] text-muted-foreground">Načítavam históriu…</p>
              ) : historyRecords.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-surface px-3 py-6 text-center text-[12px] text-muted-foreground">
                  Zatiaľ žiadne buildy v tejto konverzácii. Po build prompte sa výsledok uloží sem.
                </p>
              ) : (
                historyRecords.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => closeAndRun(() => onSelectBuildRecord(record))}
                    className="flex w-full flex-col gap-1 rounded-xl border border-border bg-surface px-3 py-3 text-left transition-colors hover:border-border hover:bg-surface"
                  >
                    <span className="line-clamp-2 text-[13px] font-medium text-fg">
                      {record.userPrompt}
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
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
                      <span className="text-[11px] text-muted-foreground">{record.planSummary}</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          ) : null}

          {view === "profile" ? (
            <ProfileSettingsView
              onClose={() => setView("main")}
              className="pb-6"
            />
          ) : null}

          {view === "help" ? (
            <div className="space-y-3 text-[12px] leading-relaxed text-subtle">
              <p>
                <strong className="text-fg/80">1. Planner</strong> — pred streamom vytvorí JSON plán
                (sekcie, farby, CTA).
              </p>
              <p>
                <strong className="text-fg/80">2. Builder</strong> — Mistral stream vygeneruje
                ```html``` artifact.
              </p>
              <p>
                <strong className="text-fg/80">3. Evaluator</strong> — lokálna validácia HTML (skóre
                0–1).
              </p>
              <p>
                <strong className="text-fg/80">4. Refine</strong> — ak HTML chýba, auto-doplnenie max
                2×.
              </p>
              <p>
                <strong className="text-fg/80">5. Preview</strong> — live náhľad + export. História v
                IndexedDB.
              </p>
              <p className="rounded-lg border border-border bg-surface px-3 py-2 text-[11px] text-muted-foreground">
                Tip: použij ⋯ More options pre rýchle prompty „Dokonči stránku“ alebo „Pridaj script“.
              </p>
            </div>
          ) : null}
        </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
