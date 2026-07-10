import { extractJarvisHtmlArtifact } from "@/copied-from-visual-html/lib/jarvis-artifacts"
import type { JarvisMessage } from "@/copied-from-visual-html/types/jarvis"
import { evaluateBuildArtifact } from "@/lib/agents/build-evaluator"
import { evaluateMobileReadiness } from "@/lib/agents/build-mobile-validator"
import type { BuildEvaluation, BuildPhaseMetric, BuildTrace } from "@/types/build"

export const MAX_REFINEMENT_ROUNDS = 2

type BuildMessage = Pick<JarvisMessage, "role" | "content">

export type RunBuildEvaluationOptions = {
  isStreaming?: boolean
  refinementRounds?: number
  builderLatencyMs?: number
  priorTrace?: BuildTrace
}

export type RunBuildEvaluationResult = {
  evaluation: BuildEvaluation
  trace: BuildTrace
  refinementPrompt: string | null
  artifact: string | null
}

export function buildRefinementPrompt(issues: string[]): string {
  const issueList = issues.length > 0 ? issues.join(", ") : "kompletný HTML dokument"
  const hasStructuralIssue = issues.some(
    (issue) =>
      issue.includes("</html>") ||
      issue.includes("useknutý") ||
      issue.includes("<script>") ||
      issue.includes("Dokument je"),
  )
  const hasMobileIssue = issues.some(
    (issue) =>
      issue.includes("mobile") ||
      issue.includes("@media") ||
      issue.includes("viewport") ||
      issue.includes("touch-friendly") ||
      issue.includes("420px") ||
      issue.includes("overflow"),
  )

  if (hasStructuralIssue && hasMobileIssue) {
    return `Dokonči a oprav HTML dokument. Chýba: ${issueList}. Pridaj funkčný inline <script> pre všetky buttony, @media (max-width: 768px), viewport meta, max-width: 100% na mobile (420px) a uzavri </html>.`
  }

  if (hasMobileIssue) {
    return `Oprav responzivitu pre mobile (420px šírka, iPhone). Chýba: ${issueList}. Pridaj @media (max-width: 768px), viewport meta a touch-friendly buttony (min 44px). Uzavri </html>.`
  }

  return `Dokonči HTML dokument. Chýba: ${issueList}. Pridaj funkčný inline <script> pre všetky buttony a uzavri </html>.`
}

export function shouldContinueRefinement(
  evaluation: BuildEvaluation,
  refinementRounds: number,
): boolean {
  return evaluation.shouldRefine && refinementRounds < MAX_REFINEMENT_ROUNDS
}

export function createEmptyBuildTrace(): BuildTrace {
  return {
    phases: [],
    totalLatencyMs: 0,
    refinementRounds: 0,
  }
}

function roundLatencyMs(start: number): number {
  return Math.round(performance.now() - start)
}

function appendPhase(trace: BuildTrace, phase: BuildPhaseMetric): BuildTrace {
  return {
    ...trace,
    phases: [...trace.phases, phase],
    totalLatencyMs: trace.totalLatencyMs + phase.latencyMs,
  }
}

export function recordPlannerPhase(
  trace: BuildTrace,
  latencyMs: number,
  detail?: string,
): BuildTrace {
  return appendPhase(trace, {
    phase: "planner",
    latencyMs,
    detail,
  })
}

export function runBuildEvaluation(
  messages: BuildMessage[],
  options: RunBuildEvaluationOptions = {},
): RunBuildEvaluationResult {
  const {
    isStreaming = false,
    refinementRounds = 0,
    builderLatencyMs,
    priorTrace = createEmptyBuildTrace(),
  } = options

  let trace: BuildTrace = {
    ...priorTrace,
    refinementRounds,
  }

  if (typeof builderLatencyMs === "number") {
    trace = appendPhase(trace, {
      phase: "builder",
      latencyMs: builderLatencyMs,
      detail: isStreaming ? "streaming" : "complete",
    })
  }

  const evaluatorStart = performance.now()
  const artifact = extractJarvisHtmlArtifact(messages)
  const baseEvaluation = evaluateBuildArtifact(artifact)
  const mobileReadiness = evaluateMobileReadiness(artifact)

  const evaluation =
    mobileReadiness.ok
      ? baseEvaluation
      : {
          ...baseEvaluation,
          ok: false,
          issues: [...baseEvaluation.issues, ...mobileReadiness.issues],
          shouldRefine: true,
        }

  trace = appendPhase(trace, {
    phase: "evaluator",
    latencyMs: roundLatencyMs(evaluatorStart),
    detail: `score=${evaluation.score.toFixed(2)}; ok=${evaluation.ok}`,
  })

  let refinementPrompt: string | null = null

  if (shouldContinueRefinement(evaluation, refinementRounds)) {
    refinementPrompt = buildRefinementPrompt(evaluation.issues)
    trace = appendPhase(trace, {
      phase: "refine",
      latencyMs: 0,
      detail: `round ${refinementRounds + 1}/${MAX_REFINEMENT_ROUNDS}`,
    })
  }

  return {
    evaluation,
    trace,
    refinementPrompt,
    artifact,
  }
}