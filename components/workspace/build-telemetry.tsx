"use client"

import type { BuildEvaluation } from "@/types/build"
import type { BuildTrace } from "@/types/build"

import type { BuildPhase, BuildPlan } from "@/types/build"

import { BuildMetrics } from "./build-metrics"
import { BuildReasoningPanel } from "./build-reasoning-panel"
import { StoryboardStrip } from "./storyboard-strip"

type BuildTelemetryProps = {
  buildTrace: BuildTrace | null
  buildEvaluation: BuildEvaluation | null
  htmlChars: number
  isStreaming?: boolean
  activePhase?: BuildPhase | null
  plannerPlan?: BuildPlan | null
  collapsible?: boolean
  historyCount?: number
}

export function BuildTelemetry({
  buildTrace,
  buildEvaluation,
  htmlChars,
  isStreaming = false,
  activePhase = null,
  plannerPlan = null,
  collapsible = false,
  historyCount = 0,
}: BuildTelemetryProps) {
  const isPlanning = activePhase === "planner"
  const showStoryboard = isPlanning || Boolean(plannerPlan)
  return (
    <div className="shrink-0 border-b border-border bg-background">
      <div className="space-y-3 px-3 py-3 md:px-4">
        <BuildMetrics
          htmlChars={htmlChars}
          latencyMs={buildTrace?.totalLatencyMs ?? 0}
          refinementRounds={buildTrace?.refinementRounds ?? 0}
          isStreaming={isStreaming}
        />
      </div>
      <BuildReasoningPanel
        buildTrace={buildTrace}
        buildEvaluation={buildEvaluation}
        isStreaming={isStreaming}
        activePhase={activePhase}
        collapsible={collapsible}
        defaultOpen={!collapsible}
        historyCount={historyCount}
      />
      {showStoryboard ? (
        <StoryboardStrip plan={plannerPlan} isPlanning={isPlanning} />
      ) : null}
    </div>
  )
}