import { formatPlanForSystemPrompt } from "@/lib/agents/build-plan-utils"
import {
  createEmptyBuildTrace,
  recordPlannerPhase,
  runBuildEvaluation,
} from "@/lib/agents/build-orchestrator"
import type { BuildEvaluation, BuildTrace, PlannerResult } from "@/types/build"

export type PipelineChatMessage = {
  role: "user" | "assistant"
  content: string
  imageData?: string
}

export type PipelineStreamResult = {
  content: string
  latencyMs: number
}

export type PipelineStreamReply = (
  history: PipelineChatMessage[],
  systemPrompt: string,
) => Promise<PipelineStreamResult>

export type PipelineFetchPlan = (
  prompt: string,
  experienceHint: string | null,
) => Promise<PlannerResult | null>

export type BuildPipelineRound = {
  userMessage: PipelineChatMessage
  assistantContent: string
}

export type BuildPipelineInput = {
  priorHistory: PipelineChatMessage[]
  userMessage: PipelineChatMessage
  baseSystemPrompt: string
  experienceHint: string | null
  fetchPlan: PipelineFetchPlan
  streamReply: PipelineStreamReply
  onPlannerStart?: () => void | Promise<void>
  onPlannerComplete?: (planResult: PlannerResult | null) => void | Promise<void>
  onRefinementRound?: (args: { refinementPrompt: string; round: number }) => void | Promise<void>
  onRoundComplete?: (round: BuildPipelineRound) => void | Promise<void>
}

export type BuildPipelineResult = {
  conversationHistory: PipelineChatMessage[]
  systemPrompt: string
  trace: BuildTrace
  evaluation: BuildEvaluation | null
  artifact: string | null
  refinementRounds: number
  planApplied: boolean
  completedRounds: BuildPipelineRound[]
}

export function buildIncompleteHtmlError(
  evaluation: BuildEvaluation,
  refinementRounds: number,
): string {
  const scoreLabel = `${Math.round(evaluation.score * 100)}%`
  const refineHint =
    refinementRounds > 0 ? ` Vykonané automatické doplnenia: ${refinementRounds}.` : ""

  return `HTML nie je kompletný (${scoreLabel}): ${evaluation.issues.join(" · ")}.${refineHint} Skús znova alebo napíš „dokonči stránku“.`
}

export async function runBuildPipeline(input: BuildPipelineInput): Promise<BuildPipelineResult> {
  let systemPrompt = input.baseSystemPrompt
  let trace = createEmptyBuildTrace()
  let conversationHistory: PipelineChatMessage[] = [...input.priorHistory, input.userMessage]
  let planApplied = false

  let planResult: PlannerResult | null = null

  try {
    await input.onPlannerStart?.()
    planResult = await input.fetchPlan(input.userMessage.content, input.experienceHint)
    if (planResult?.plan) {
      trace = recordPlannerPhase(trace, planResult.latencyMs ?? 0, planResult.plan.summary)
      systemPrompt = `${systemPrompt}\n\n${formatPlanForSystemPrompt(planResult.plan, input.experienceHint)}`
      planApplied = true
    }
  } catch {
    // Planner is best-effort; builder can continue without it.
  } finally {
    await input.onPlannerComplete?.(planResult)
  }

  let refinementRounds = 0
  let evaluation: BuildEvaluation | null = null
  const completedRounds: BuildPipelineRound[] = []
  let roundUserMessage = input.userMessage

  const { content: initialContent, latencyMs: initialLatencyMs } = await input.streamReply(
    conversationHistory,
    systemPrompt,
  )

  conversationHistory = [...conversationHistory, { role: "assistant", content: initialContent }]
  const initialRound: BuildPipelineRound = {
    userMessage: roundUserMessage,
    assistantContent: initialContent,
  }
  completedRounds.push(initialRound)
  await input.onRoundComplete?.(initialRound)

  let orchestration = runBuildEvaluation(
    conversationHistory.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    {
      builderLatencyMs: initialLatencyMs,
      refinementRounds,
      priorTrace: trace,
    },
  )

  trace = orchestration.trace
  evaluation = orchestration.evaluation

  while (orchestration.refinementPrompt) {
    refinementRounds += 1
    trace = { ...trace, refinementRounds }

    await input.onRefinementRound?.({
      refinementPrompt: orchestration.refinementPrompt,
      round: refinementRounds,
    })

    const refineUserMessage: PipelineChatMessage = {
      role: "user",
      content: orchestration.refinementPrompt,
    }

    conversationHistory = [...conversationHistory, refineUserMessage]
    roundUserMessage = refineUserMessage

    const { content: refinedContent, latencyMs: refinedLatencyMs } = await input.streamReply(
      conversationHistory,
      systemPrompt,
    )

    conversationHistory = [...conversationHistory, { role: "assistant", content: refinedContent }]
    const refineRound: BuildPipelineRound = {
      userMessage: refineUserMessage,
      assistantContent: refinedContent,
    }
    completedRounds.push(refineRound)
    await input.onRoundComplete?.(refineRound)

    orchestration = runBuildEvaluation(
      conversationHistory.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      {
        builderLatencyMs: refinedLatencyMs,
        refinementRounds,
        priorTrace: trace,
      },
    )

    trace = orchestration.trace
    evaluation = orchestration.evaluation
  }

  return {
    conversationHistory,
    systemPrompt,
    trace,
    evaluation,
    artifact: orchestration.artifact,
    refinementRounds,
    planApplied,
    completedRounds,
  }
}