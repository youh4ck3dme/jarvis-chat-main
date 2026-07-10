import { generateObject } from "ai"
import { createMistral } from "@ai-sdk/mistral"

import {
  buildPlanSchema,
  createFallbackBuildPlan,
  normalizeBuildPlan,
} from "@/lib/agents/build-plan-utils"
import { Logger } from "@/lib/logger"
import type { PlannerResult } from "@/types/build"

const PLANNER_TIMEOUT_MS = 3000

function buildPlannerPrompt(userPrompt: string, experienceHint?: string | null): string {
  const lines = [
    "You are the planner step of the Jarvis HTML build pipeline.",
    "Return a concise build plan for a single self-contained HTML page.",
    "Sections should be short snake-case or kebab-case identifiers (hero, about, contact, footer).",
    "Pick language SK, CZ, or EN based on the user prompt.",
    "Set mustHaveScript to true so every button has working inline JavaScript.",
    `User prompt:\n"""${userPrompt.trim()}"""`,
  ]

  if (experienceHint?.trim()) {
    lines.push(`Historical hint:\n"""${experienceHint.trim()}"""`)
  }

  return lines.join("\n")
}

export async function planBuild(
  apiKey: string,
  userPrompt: string,
  experienceHint?: string | null,
): Promise<PlannerResult> {
  const trimmedPrompt = userPrompt.trim()
  if (!trimmedPrompt) {
    const plan = createFallbackBuildPlan("Single-page HTML build")
    return { plan, latencyMs: 0 }
  }

  const startedAt = performance.now()

  try {
    const mistral = createMistral({ apiKey })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PLANNER_TIMEOUT_MS)

    const { object } = await generateObject({
      model: mistral("mistral-small-latest"),
      schema: buildPlanSchema,
      prompt: buildPlannerPrompt(trimmedPrompt, experienceHint),
      abortSignal: controller.signal,
      maxRetries: 0,
    })

    clearTimeout(timeout)

    return {
      plan: normalizeBuildPlan(object),
      latencyMs: Math.round(performance.now() - startedAt),
    }
  } catch (error) {
    Logger.warn("Falling back to heuristic plan", { route: "build-planner", error: String(error) })
    return {
      plan: createFallbackBuildPlan(trimmedPrompt),
      latencyMs: Math.round(performance.now() - startedAt),
    }
  }
}