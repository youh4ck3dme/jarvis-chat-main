"use client"

import { ChevronDown } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { BuildEvaluation } from "@/types/build"
import type { BuildPhase, BuildTrace } from "@/types/build"

import { formatLatency, StrategyBadge } from "./build-metrics"

const PIPELINE_STEPS: { phase: BuildPhase; label: string }[] = [
  { phase: "planner", label: "Plan" },
  { phase: "builder", label: "Stream" },
  { phase: "evaluator", label: "Validate" },
  { phase: "refine", label: "Refine" },
]

function formatPhaseLabel(phase: BuildPhase): string {
  return PIPELINE_STEPS.find((step) => step.phase === phase)?.label ?? phase
}

type BuildReasoningPanelProps = {
  buildTrace: BuildTrace | null
  buildEvaluation: BuildEvaluation | null
  isStreaming?: boolean
  activePhase?: BuildPhase | null
  collapsible?: boolean
  defaultOpen?: boolean
  historyCount?: number
}

export function BuildReasoningPanel({
  buildTrace,
  buildEvaluation,
  isStreaming = false,
  activePhase = null,
  collapsible = false,
  defaultOpen = true,
  historyCount = 0,
}: BuildReasoningPanelProps) {
  const completedPhases = new Set(buildTrace?.phases.map((entry) => entry.phase) ?? [])
  const hasBuildActivity = Boolean(buildTrace) || isStreaming

  const content = (
    <div className="space-y-3">
      {isStreaming ? (
        <div className="h-0.5 overflow-hidden rounded-full bg-border/60" aria-hidden>
          <div className="h-full w-1/3 rounded-full bg-emerald-500/70 animate-loading-bar" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        {PIPELINE_STEPS.map((step) => (
          <StrategyBadge
            key={step.phase}
            label={step.label}
            active={
              completedPhases.has(step.phase) ||
              activePhase === step.phase ||
              (isStreaming && step.phase === "builder" && !completedPhases.has("evaluator"))
            }
          />
        ))}
      </div>

      {historyCount > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          IndexedDB história: {historyCount} uložených buildov (max 50).
        </p>
      ) : null}

      {!hasBuildActivity ? (
        <p className="text-[12px] text-muted-foreground">Zatiaľ nebol build. Pošli prompt a metriky sa zobrazia tu.</p>
      ) : (
        <ol className="space-y-2">
          {buildTrace?.phases.map((entry, index) => (
            <li
              key={`${entry.phase}-${index}`}
              className="flex items-start gap-2 rounded-lg border border-border bg-panel px-3 py-2"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-border/50 text-[10px] font-semibold text-subtle">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StrategyBadge label={formatPhaseLabel(entry.phase)} active />
                  <span className="text-[11px] text-muted-foreground">{formatLatency(entry.latencyMs)}</span>
                </div>
                {entry.detail ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{entry.detail}</p>
                ) : null}
              </div>
            </li>
          ))}

          {isStreaming ? (
            <li className="animate-fade-in flex items-start gap-2 rounded-lg border border-dashed border-border bg-panel px-3 py-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-border/50 text-[10px] font-semibold text-subtle">
                {(buildTrace?.phases.length ?? 0) + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StrategyBadge label="Stream" active />
                  <span className="text-[11px] text-muted-foreground">in progress…</span>
                </div>
              </div>
            </li>
          ) : null}

          {buildEvaluation && buildEvaluation.issues.length > 0 ? (
            <li className="rounded-lg border border-[#3a2a2a] bg-[#1a1414] px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a66]">Issues</p>
              <ul className="mt-1 space-y-1 text-[11px] text-[#999]">
                {buildEvaluation.issues.map((issue) => (
                  <li key={issue}>• {issue}</li>
                ))}
              </ul>
            </li>
          ) : null}
        </ol>
      )}
    </div>
  )

  if (!collapsible) {
    return (
      <section className="px-3 pb-3 md:px-4">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Build Trace</h3>
        {content}
      </section>
    )
  }

  return (
    <Collapsible defaultOpen={defaultOpen} className="bg-background">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2.5 text-left md:px-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Build Trace</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className={cn("px-3 pb-3 md:px-4")}>{content}</CollapsibleContent>
    </Collapsible>
  )
}