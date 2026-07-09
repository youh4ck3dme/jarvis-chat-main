import { describe, expect, it } from "vitest"

import { COMPLETE_HTML, TRUNCATED_HTML } from "./__fixtures__/html-samples"
import {
  buildRefinementPrompt,
  createEmptyBuildTrace,
  MAX_REFINEMENT_ROUNDS,
  recordPlannerPhase,
  runBuildEvaluation,
  shouldContinueRefinement,
} from "./build-orchestrator"

describe("build-orchestrator", () => {
  it("requests refinement for truncated HTML missing </html>", () => {
    const result = runBuildEvaluation([
      { role: "user", content: "Build a landing page" },
      { role: "assistant", content: TRUNCATED_HTML },
    ])

    expect(result.evaluation.shouldRefine).toBe(true)
    expect(result.evaluation.issues).toContain("Dokument je useknutý — chýba </html>")
    expect(result.refinementPrompt).toContain("Dokonči HTML dokument")
    expect(result.refinementPrompt).toContain("</html>")
    expect(result.trace.phases.some((phase) => phase.phase === "evaluator")).toBe(true)
    expect(result.trace.phases.some((phase) => phase.phase === "refine")).toBe(true)
  })

  it("requests mobile refinement when responsive markup is missing", () => {
    const html = `\`\`\`html
<!DOCTYPE html><html><head></head><body><button>Go</button><script>document.querySelector("button")</script></body></html>
\`\`\``

    const result = runBuildEvaluation([
      { role: "user", content: "Build" },
      { role: "assistant", content: html },
    ])

    expect(result.evaluation.shouldRefine).toBe(true)
    expect(result.refinementPrompt).toContain("420px")
  })

  it("does not refine complete HTML", () => {
    const result = runBuildEvaluation([
      { role: "user", content: "Build a landing page" },
      { role: "assistant", content: COMPLETE_HTML },
    ])

    expect(result.evaluation.ok).toBe(true)
    expect(result.refinementPrompt).toBeNull()
    expect(result.trace.phases.some((phase) => phase.phase === "refine")).toBe(false)
  })

  it("stops refinement after max rounds", () => {
    const truncatedEvaluation = runBuildEvaluation([
      { role: "user", content: "Build" },
      { role: "assistant", content: TRUNCATED_HTML },
    ])

    expect(shouldContinueRefinement(truncatedEvaluation.evaluation, 0)).toBe(true)
    expect(shouldContinueRefinement(truncatedEvaluation.evaluation, MAX_REFINEMENT_ROUNDS)).toBe(
      false,
    )

    const blocked = runBuildEvaluation(
      [
        { role: "user", content: "Build" },
        { role: "assistant", content: TRUNCATED_HTML },
      ],
      { refinementRounds: MAX_REFINEMENT_ROUNDS },
    )

    expect(blocked.refinementPrompt).toBeNull()
    expect(blocked.trace.refinementRounds).toBe(MAX_REFINEMENT_ROUNDS)
  })

  it("builds refinement prompt from issues", () => {
    const prompt = buildRefinementPrompt(["Chýba <script>", "Dokument je useknutý — chýba </html>"])

    expect(prompt).toContain("Chýba <script>")
    expect(prompt).toContain("inline <script>")
    expect(prompt).toContain("</html>")
  })

  it("allows at most two refinement rounds in the loop", () => {
    const messages = [
      { role: "user" as const, content: "Build a landing page" },
      { role: "assistant" as const, content: TRUNCATED_HTML },
    ]

    let refinementRounds = 0
    let result = runBuildEvaluation(messages, { refinementRounds })
    expect(result.refinementPrompt).not.toBeNull()

    refinementRounds += 1
    result = runBuildEvaluation(messages, { refinementRounds, priorTrace: result.trace })
    expect(result.refinementPrompt).not.toBeNull()

    refinementRounds += 1
    result = runBuildEvaluation(messages, { refinementRounds, priorTrace: result.trace })
    expect(result.refinementPrompt).toBeNull()
    expect(result.trace.refinementRounds).toBe(2)
  })

  it("records planner phase in trace", () => {
    const trace = recordPlannerPhase(createEmptyBuildTrace(), 180, "Coffee shop plan")

    expect(trace.phases).toHaveLength(1)
    expect(trace.phases[0]).toMatchObject({
      phase: "planner",
      latencyMs: 180,
      detail: "Coffee shop plan",
    })
    expect(trace.totalLatencyMs).toBe(180)
  })

  it("records builder latency in trace", () => {
    const result = runBuildEvaluation(
      [
        { role: "user", content: "Build" },
        { role: "assistant", content: TRUNCATED_HTML },
      ],
      { builderLatencyMs: 420 },
    )

    const builderPhase = result.trace.phases.find((phase) => phase.phase === "builder")
    expect(builderPhase?.latencyMs).toBe(420)
    expect(result.trace.totalLatencyMs).toBeGreaterThanOrEqual(420)
  })
})