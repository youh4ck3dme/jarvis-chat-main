"use client"

import { cn } from "@/lib/utils"

export function formatLatency(milliseconds: number): string {
  if (milliseconds <= 0) {
    return "—"
  }
  if (milliseconds < 1000) {
    return `${milliseconds} ms`
  }
  const seconds = milliseconds / 1000
  if (seconds < 60) {
    const precision = seconds < 10 ? 1 : 0
    return `${seconds.toFixed(precision)} s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  if (remainingSeconds === 0) {
    return `${minutes} min`
  }
  return `${minutes} min ${remainingSeconds} s`
}

export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatCharCount(chars: number): string {
  if (chars <= 0) {
    return "—"
  }
  return `${chars.toLocaleString()} chars`
}

type StrategyBadgeProps = {
  label: string
  active?: boolean
}

export function StrategyBadge({ label, active = false }: StrategyBadgeProps) {
  return (
    <span
      className={cn(
        "jarvis-system-status rounded-full px-2.5 py-1 uppercase",
        active
          ? "border border-border bg-border/50 text-fg"
          : "border border-border bg-surface text-muted-foreground",
      )}
    >
      {label}
    </span>
  )
}

type MetricTileProps = {
  label: string
  value: string
}

export function MetricTile({ label, value }: MetricTileProps) {
  return (
    <div className="rounded-lg border border-border bg-surface/80 px-3 py-2 backdrop-blur-sm">
      <dt className="jarvis-system-status uppercase">{label}</dt>
      <dd className="jarvis-metric-readout mt-1 text-fg">{value}</dd>
    </div>
  )
}

type BuildMetricsProps = {
  htmlChars: number
  latencyMs: number
  refinementRounds: number
  isStreaming?: boolean
}

export function BuildMetrics({
  htmlChars,
  latencyMs,
  refinementRounds,
  isStreaming = false,
}: BuildMetricsProps) {
  return (
    <dl className="grid grid-cols-3 gap-2">
      <MetricTile
        label="HTML Size"
        value={isStreaming && htmlChars === 0 ? "…" : formatCharCount(htmlChars)}
      />
      <MetricTile
        label="Build Latency"
        value={isStreaming && latencyMs === 0 ? "…" : formatLatency(latencyMs)}
      />
      <MetricTile label="Refinements" value={isStreaming ? "…" : `${refinementRounds}`} />
    </dl>
  )
}