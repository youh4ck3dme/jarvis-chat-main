export type BuildPhase = "planner" | "builder" | "evaluator" | "refine"

export type BuildLanguage = "SK" | "CZ" | "EN"

export type BuildPlan = {
  summary: string
  sections: string[]
  primaryColor?: string
  ctaLabel?: string
  language: BuildLanguage
  mustHaveScript: boolean
}

export type PlannerResult = {
  plan: BuildPlan
  latencyMs: number
}

export type BuildEvaluation = {
  ok: boolean
  score: number
  issues: string[]
  shouldRefine: boolean
}

export type BuildPhaseMetric = {
  phase: BuildPhase
  latencyMs: number
  detail?: string
}

export type BuildTrace = {
  phases: BuildPhaseMetric[]
  totalLatencyMs: number
  refinementRounds: number
}