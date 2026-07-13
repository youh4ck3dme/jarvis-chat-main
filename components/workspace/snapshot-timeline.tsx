"use client"

import { useMemo, useState } from "react"
import { Columns2, History, Pin, PinOff } from "lucide-react"

import type { BuildHistoryRecord } from "@/lib/build-history/build-history-store"
import { compareSnapshotHtml } from "@/lib/build-history/snapshot-diff"
import { cn } from "@/lib/utils"

type SnapshotTimelineProps = {
  records: BuildHistoryRecord[]
  selectedId?: string | null
  compareId?: string | null
  pinnedIds?: string[]
  onSelect: (record: BuildHistoryRecord) => void
  onCompare?: (before: BuildHistoryRecord, after: BuildHistoryRecord) => void
  onTogglePin?: (record: BuildHistoryRecord) => void
  className?: string
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function SnapshotCard({
  record,
  previous,
  selected,
  pinned,
  onSelect,
  onCompare,
  onTogglePin,
}: {
  record: BuildHistoryRecord
  previous?: BuildHistoryRecord | null
  selected: boolean
  pinned: boolean
  onSelect: () => void
  onCompare?: () => void
  onTogglePin?: () => void
}) {
  const score = Math.round((record.evaluation.score ?? 0) * 100)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onSelect}
        data-testid="snapshot-timeline-card"
        className={cn(
          "group flex w-[148px] flex-col overflow-hidden rounded-lg border bg-panel text-left transition-colors",
          selected
            ? "border-emerald-700/70 ring-1 ring-emerald-800/50"
            : "border-border hover:border-border/80 hover:bg-surface",
          pinned && "border-amber-700/60",
        )}
      >
        <div className="relative h-20 bg-zinc-900">
          {record.thumbnailDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={record.thumbnailDataUrl}
              alt=""
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-muted-foreground">
              {record.html ? "No preview" : "Legacy (no HTML)"}
            </div>
          )}
          <span className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-100">
            {score}%
          </span>
          {pinned ? (
            <span className="absolute left-1.5 top-1.5 rounded bg-amber-950/80 px-1.5 py-0.5 text-[10px] text-amber-200">
              pinned
            </span>
          ) : null}
        </div>
        <div className="space-y-1 px-2 py-2">
          <p className="truncate text-[11px] font-medium text-zinc-200">{record.userPrompt || "Build"}</p>
          <p className="text-[10px] text-muted-foreground">{formatTime(record.createdAt)}</p>
        </div>
      </button>

      <div className="absolute -bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1">
        {hovered && record.html && onTogglePin ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onTogglePin()
            }}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[10px] font-medium text-zinc-300 shadow-md"
            data-testid="snapshot-pin-btn"
            aria-label={pinned ? "Unpin from component library" : "Pin to component library"}
          >
            {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
            {pinned ? "Unpin" : "Pin"}
          </button>
        ) : null}
        {hovered && previous?.html && record.html && onCompare ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onCompare()
            }}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[10px] font-medium text-zinc-300 shadow-md"
            data-testid="snapshot-compare-btn"
          >
            <Columns2 className="h-3 w-3" />
            A/B
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function SnapshotTimeline({
  records,
  selectedId,
  compareId,
  pinnedIds = [],
  onSelect,
  onCompare,
  onTogglePin,
  className,
}: SnapshotTimelineProps) {
  const ordered = useMemo(
    () => [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [records],
  )
  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds])

  if (ordered.length === 0) {
    return null
  }

  return (
    <section
      className={cn("shrink-0 border-b border-border bg-background", className)}
      data-testid="snapshot-timeline"
    >
      <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-muted-foreground md:px-4">
        <History className="h-3.5 w-3.5" />
        Snapshot timeline
        <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px]">{ordered.length}</span>
        {pinnedIds.length > 0 ? (
          <span className="rounded-full border border-amber-900/50 bg-amber-950/30 px-1.5 py-0.5 text-[10px] text-amber-200">
            {pinnedIds.length} pinned
          </span>
        ) : null}
      </div>
      <div className="flex gap-2 overflow-x-auto px-3 pb-4 [scrollbar-width:thin] md:px-4">
        {ordered.map((record, index) => {
          const previous = index > 0 ? ordered[index - 1] : null
          return (
            <SnapshotCard
              key={record.id}
              record={record}
              previous={previous}
              selected={record.id === selectedId || record.id === compareId}
              pinned={pinnedSet.has(record.id)}
              onSelect={() => onSelect(record)}
              onCompare={
                previous && onCompare
                  ? () => onCompare(previous, record)
                  : undefined
              }
              onTogglePin={onTogglePin ? () => onTogglePin(record) : undefined}
            />
          )
        })}
      </div>
    </section>
  )
}

type SnapshotComparePanelProps = {
  before: BuildHistoryRecord
  after: BuildHistoryRecord
  onClose: () => void
}

export function SnapshotComparePanel({ before, after, onClose }: SnapshotComparePanelProps) {
  const diff = useMemo(
    () => compareSnapshotHtml(before.html ?? "", after.html ?? ""),
    [before.html, after.html],
  )

  const changedLines = diff.textLines.filter((line) => line.type !== "same").slice(0, 80)

  return (
    <section
      className="shrink-0 border-b border-border bg-canvas"
      data-testid="snapshot-compare-panel"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/80 px-3 py-2 md:px-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-fg">
            Before vs after · {diff.textSummary}
            {diff.addedNodes || diff.removedNodes
              ? ` · DOM +${diff.addedNodes}/−${diff.removedNodes}`
              : ""}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {formatTime(before.createdAt)} → {formatTime(after.createdAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-surface"
        >
          Close
        </button>
      </div>

      <div className="grid max-h-56 gap-0 overflow-hidden md:grid-cols-2">
        <div className="min-h-0 border-b border-border/80 md:border-b-0 md:border-r">
          <p className="border-b border-border/60 px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            Before
          </p>
          {before.thumbnailDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={before.thumbnailDataUrl} alt="Before snapshot" className="h-28 w-full object-cover object-top" />
          ) : (
            <div className="flex h-28 items-center justify-center text-[11px] text-muted-foreground">No thumb</div>
          )}
        </div>
        <div className="min-h-0">
          <p className="border-b border-border/60 px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            After
          </p>
          {after.thumbnailDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={after.thumbnailDataUrl} alt="After snapshot" className="h-28 w-full object-cover object-top" />
          ) : (
            <div className="flex h-28 items-center justify-center text-[11px] text-muted-foreground">No thumb</div>
          )}
        </div>
      </div>

      <div className="max-h-40 overflow-auto border-t border-border/80 font-mono text-[10px] leading-4 [scrollbar-width:thin]">
        {changedLines.length === 0 ? (
          <p className="px-3 py-2 text-muted-foreground">No textual diff</p>
        ) : (
          changedLines.map((line, index) => (
            <div
              key={`${line.type}-${index}`}
              className={cn(
                "whitespace-pre-wrap break-all px-3 py-0.5",
                line.type === "add" && "bg-emerald-950/40 text-emerald-300",
                line.type === "remove" && "bg-red-950/40 text-red-300",
              )}
            >
              <span className="mr-2 opacity-60">{line.type === "add" ? "+" : "−"}</span>
              {line.text}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
