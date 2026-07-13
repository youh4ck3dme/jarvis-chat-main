"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Globe, Gauge, Navigation, Terminal, Trash2 } from "lucide-react"

import type {
  PreviewConsoleEntry,
  PreviewErrorEntry,
  PreviewNavigationEntry,
  PreviewNetworkEntry,
  PreviewPerformanceEntry,
} from "@/copied-from-visual-html/lib/preview-console-bridge"
import { cn } from "@/lib/utils"

export type RuntimeInspectorFilter = "all" | "console" | "errors" | "network" | "navigation" | "performance"

export type RuntimeInspectorState = {
  consoleEntries: PreviewConsoleEntry[]
  errorEntries: PreviewErrorEntry[]
  networkEntries: PreviewNetworkEntry[]
  navigationEntries: PreviewNavigationEntry[]
  performanceEntries: PreviewPerformanceEntry[]
}

type RuntimeInspectorPanelProps = {
  className?: string
  state: RuntimeInspectorState
  onClear: () => void
}

const FILTERS: { id: RuntimeInspectorFilter; label: string; icon: typeof Terminal }[] = [
  { id: "all", label: "All", icon: Terminal },
  { id: "console", label: "Console", icon: Terminal },
  { id: "errors", label: "Errors", icon: AlertTriangle },
  { id: "network", label: "Network", icon: Globe },
  { id: "navigation", label: "Nav", icon: Navigation },
  { id: "performance", label: "Perf", icon: Gauge },
]

function formatTime(ts: number): string {
  const date = new Date(ts)
  return date.toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function ConsoleRow({ entry }: { entry: PreviewConsoleEntry }) {
  return (
    <div className="border-b border-border/60 px-3 py-2 font-mono text-[11px] leading-5" data-testid="inspector-console-row">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>{formatTime(entry.ts)}</span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
            entry.level === "error" && "bg-red-950/50 text-red-300",
            entry.level === "warn" && "bg-amber-950/40 text-amber-300",
            entry.level === "info" && "bg-sky-950/40 text-sky-300",
            entry.level === "log" && "bg-zinc-800 text-zinc-300",
          )}
        >
          {entry.level}
        </span>
      </div>
      <p className="mt-1 break-all text-zinc-300">{entry.args.join(" ")}</p>
    </div>
  )
}

function ErrorRow({ entry }: { entry: PreviewErrorEntry }) {
  return (
    <div className="border-b border-border/60 px-3 py-2" data-testid="inspector-error-row">
      <div className="flex items-center gap-2 text-[11px] text-red-300">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium uppercase tracking-wide">{entry.kind}</span>
        <span className="text-muted-foreground">{formatTime(entry.ts)}</span>
      </div>
      <p className="mt-1 text-sm text-zinc-200">{entry.message}</p>
      {entry.source ? (
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {entry.source}
          {entry.lineno != null ? `:${entry.lineno}` : ""}
          {entry.colno != null ? `:${entry.colno}` : ""}
        </p>
      ) : null}
      {entry.stack ? (
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] leading-4 text-muted-foreground">
          {entry.stack}
        </pre>
      ) : null}
    </div>
  )
}

function NetworkRow({ entry }: { entry: PreviewNetworkEntry }) {
  const statusLabel =
    entry.error != null
      ? `ERR ${entry.error}`
      : entry.status != null
        ? String(entry.status)
        : "—"

  return (
    <div className="border-b border-border/60 px-3 py-2 font-mono text-[11px]" data-testid="inspector-network-row">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">{formatTime(entry.ts)}</span>
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-300">{entry.kind}</span>
        <span className="text-sky-300">{entry.method}</span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px]",
            entry.error || (entry.status != null && entry.status >= 400)
              ? "bg-red-950/50 text-red-300"
              : "bg-emerald-950/40 text-emerald-300",
          )}
        >
          {statusLabel}
        </span>
        {entry.durationMs != null ? <span className="text-muted-foreground">{entry.durationMs}ms</span> : null}
      </div>
      <p className="mt-1 break-all text-zinc-300">{entry.url}</p>
    </div>
  )
}

function NavigationRow({ entry }: { entry: PreviewNavigationEntry }) {
  return (
    <div className="border-b border-border/60 px-3 py-2 font-mono text-[11px]" data-testid="inspector-navigation-row">
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
        <span>{formatTime(entry.ts)}</span>
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-300">
          {entry.navigationType}
        </span>
      </div>
      <p className="mt-1 break-all text-zinc-300">{entry.href ?? entry.url}</p>
      {entry.text ? <p className="mt-1 text-muted-foreground">{entry.text}</p> : null}
    </div>
  )
}

function PerformanceRow({ entry }: { entry: PreviewPerformanceEntry }) {
  return (
    <div className="border-b border-border/60 px-3 py-2 font-mono text-[11px]" data-testid="inspector-performance-row">
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
        <span>{formatTime(entry.ts)}</span>
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-300">
          {entry.entryType}
        </span>
        <span className="text-zinc-300">{entry.name}</span>
        {entry.duration != null ? <span>{entry.duration.toFixed(2)}ms</span> : null}
      </div>
    </div>
  )
}

export function RuntimeInspectorPanel({ className, state, onClear }: RuntimeInspectorPanelProps) {
  const [filter, setFilter] = useState<RuntimeInspectorFilter>("all")

  const counts = useMemo(
    () => ({
      console: state.consoleEntries.length,
      errors: state.errorEntries.length,
      network: state.networkEntries.length,
      navigation: state.navigationEntries.length,
      performance: state.performanceEntries.length,
    }),
    [state],
  )

  const totalCount =
    counts.console + counts.errors + counts.network + counts.navigation + counts.performance

  const isEmpty =
    (filter === "all" && totalCount === 0) ||
    (filter === "console" && counts.console === 0) ||
    (filter === "errors" && counts.errors === 0) ||
    (filter === "network" && counts.network === 0) ||
    (filter === "navigation" && counts.navigation === 0) ||
    (filter === "performance" && counts.performance === 0)

  return (
    <section className={cn("flex min-h-0 flex-col bg-canvas", className)} data-testid="runtime-inspector-panel">
      <div className="flex h-12 items-center justify-between border-b border-border/80 bg-panel px-3 md:px-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span>Runtime Inspector</span>
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
            {totalCount}
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={totalCount === 0}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Clear inspector log"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-border/80 px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((item) => {
          const Icon = item.icon
          const count =
            item.id === "all"
              ? totalCount
              : counts[item.id as keyof typeof counts] ?? 0
          const isActive = filter === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors",
                isActive
                  ? "border-border bg-surface text-fg"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-fg/80",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {item.label}
              <span className="text-[10px] text-muted-foreground">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-auto [scrollbar-color:#3f3f46_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700/60 [&::-webkit-scrollbar-track]:bg-transparent">
        {isEmpty ? (
          <div className="flex h-full min-h-[240px] items-center justify-center p-6">
            <div className="max-w-sm rounded-lg border border-dashed border-border bg-background px-4 py-5 text-center">
              <p className="text-sm font-medium text-zinc-300">No runtime signals yet</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Console output, errors, network calls, and navigation from the sandbox iframe appear here.
              </p>
            </div>
          </div>
        ) : (
          <>
            {(filter === "all" || filter === "errors") &&
              state.errorEntries.map((entry) => <ErrorRow key={entry.id} entry={entry} />)}
            {(filter === "all" || filter === "console") &&
              state.consoleEntries.map((entry) => <ConsoleRow key={entry.id} entry={entry} />)}
            {(filter === "all" || filter === "network") &&
              state.networkEntries.map((entry) => <NetworkRow key={entry.id} entry={entry} />)}
            {(filter === "all" || filter === "navigation") &&
              state.navigationEntries.map((entry) => <NavigationRow key={entry.id} entry={entry} />)}
            {(filter === "all" || filter === "performance") &&
              state.performanceEntries.map((entry) => <PerformanceRow key={entry.id} entry={entry} />)}
          </>
        )}
      </div>
    </section>
  )
}
