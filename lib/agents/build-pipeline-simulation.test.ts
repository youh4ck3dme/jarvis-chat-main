import { describe, expect, it } from "vitest"

import { COMPLETE_HTML, NO_SCRIPT_HTML, TRUNCATED_HTML } from "./__fixtures__/html-samples"
import { getExperienceHint } from "./build-experience"
import {
  MAX_REFINEMENT_ROUNDS,
  runBuildEvaluation,
  type RunBuildEvaluationResult,
} from "./build-orchestrator"
import type { BuildExperienceEntry } from "./build-experience"

type BuildMessage = { role: "user" | "assistant"; content: string }

function simulateRefinementLoop(assistantHtml: string): {
  steps: RunBuildEvaluationResult[]
  refinementRounds: number
  final: RunBuildEvaluationResult
} {
  const messages: BuildMessage[] = [
    { role: "user", content: "Build a landing page" },
    { role: "assistant", content: assistantHtml },
  ]

  let refinementRounds = 0
  let result = runBuildEvaluation(messages, { refinementRounds })
  const steps: RunBuildEvaluationResult[] = [result]

  while (result.refinementPrompt && refinementRounds < MAX_REFINEMENT_ROUNDS) {
    refinementRounds += 1
    messages.push({ role: "user", content: result.refinementPrompt })
    messages.push({ role: "assistant", content: assistantHtml })

    result = runBuildEvaluation(messages, {
      refinementRounds,
      priorTrace: result.trace,
    })
    steps.push(result)
  }

  return { steps, refinementRounds, final: result }
}

describe("build-pipeline-simulation", () => {
  it("loops refinement twice for truncated HTML then stops", () => {
    const { steps, refinementRounds, final } = simulateRefinementLoop(TRUNCATED_HTML)

    expect(steps).toHaveLength(3)
    expect(refinementRounds).toBe(2)
    expect(steps[0]?.refinementPrompt).toContain("Dokonči")
    expect(steps[1]?.refinementPrompt).toContain("Dokonči")
    expect(final.refinementPrompt).toBeNull()
    expect(final.evaluation.shouldRefine).toBe(true)
  })

  it("does not refine complete HTML", () => {
    const { steps, refinementRounds, final } = simulateRefinementLoop(COMPLETE_HTML)

    expect(steps).toHaveLength(1)
    expect(refinementRounds).toBe(0)
    expect(final.refinementPrompt).toBeNull()
    expect(final.evaluation.ok).toBe(true)
  })

  it("keeps refining no-script HTML until max rounds", () => {
    const { steps, refinementRounds, final } = simulateRefinementLoop(NO_SCRIPT_HTML)

    expect(steps.length).toBeGreaterThan(1)
    expect(refinementRounds).toBe(2)
    expect(final.evaluation.issues).toContain("Chýba <script> — buttony pravdepodobne nebudú fungovať")
    expect(final.refinementPrompt).toBeNull()
  })

  it("activates experience hint when 6 of 10 builds miss script", () => {
    const entries: BuildExperienceEntry[] = Array.from({ length: 10 }, (_, index) => ({
      recordedAt: new Date(index).toISOString(),
      evaluation: {
        ok: false,
        score: 0.4,
        issues: index < 6 ? ["Chýba <script> — buttony pravdepodobne nebudú fungovať"] : [],
        shouldRefine: index < 6,
      },
    }))

    expect(getExperienceHint(entries)).toMatch(/inline <script>/i)
  })

  it("does not activate experience hint below 50% script failures", () => {
    const entries: BuildExperienceEntry[] = Array.from({ length: 10 }, (_, index) => ({
      recordedAt: new Date(index).toISOString(),
      evaluation: {
        ok: index >= 5,
        score: index >= 5 ? 0.9 : 0.4,
        issues: index < 5 ? ["Chýba <script>"] : [],
        shouldRefine: index < 5,
      },
    }))

    expect(getExperienceHint(entries)).toBeNull()
  })
})