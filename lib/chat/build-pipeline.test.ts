import { beforeEach, describe, expect, it, vi } from "vitest"

import { COMPLETE_HTML, TRUNCATED_HTML } from "@/lib/agents/__fixtures__/html-samples"
import {
  clearBuildHistory,
  listBuildHistory,
  resetBuildHistoryStoreForTests,
  saveBuildHistory,
} from "@/lib/build-history/build-history-store"
import type { PlannerResult } from "@/types/build"

import {
  buildIncompleteHtmlError,
  runBuildPipeline,
  type PipelineStreamReply,
} from "./build-pipeline"

const samplePlan: PlannerResult = {
  plan: {
    summary: "Coffee shop landing page",
    sections: ["hero", "menu", "contact"],
    primaryColor: "#111111",
    ctaLabel: "Order",
    language: "EN",
    mustHaveScript: true,
  },
  latencyMs: 120,
}

function createStreamReply(
  responses: string[],
): PipelineStreamReply & { calls: Array<{ historyLength: number; systemPrompt: string }> } {
  const calls: Array<{ historyLength: number; systemPrompt: string }> = []
  let index = 0

  const streamReply: PipelineStreamReply = async (history, systemPrompt) => {
    calls.push({ historyLength: history.length, systemPrompt })
    const content = responses[Math.min(index, responses.length - 1)]
    index += 1
    return { content, latencyMs: 100 + index }
  }

  return Object.assign(streamReply, { calls })
}

describe("runBuildPipeline", () => {
  it("invokes planner lifecycle callbacks", async () => {
    const onPlannerStart = vi.fn()
    const onPlannerComplete = vi.fn()
    const fetchPlan = vi.fn().mockResolvedValue(samplePlan)
    const streamReply = createStreamReply([COMPLETE_HTML])

    await runBuildPipeline({
      priorHistory: [],
      userMessage: { role: "user", content: "Build a page" },
      baseSystemPrompt: "Base",
      experienceHint: null,
      fetchPlan,
      streamReply,
      onPlannerStart,
      onPlannerComplete,
    })

    expect(onPlannerStart).toHaveBeenCalledOnce()
    expect(onPlannerComplete).toHaveBeenCalledWith(samplePlan)
  })

  it("applies planner output before the first stream", async () => {
    const fetchPlan = vi.fn().mockResolvedValue(samplePlan)
    const streamReply = createStreamReply([COMPLETE_HTML])

    const result = await runBuildPipeline({
      priorHistory: [],
      userMessage: { role: "user", content: "Build a coffee shop page" },
      baseSystemPrompt: "Base advisor prompt",
      experienceHint: null,
      fetchPlan,
      streamReply,
    })

    expect(fetchPlan).toHaveBeenCalledWith("Build a coffee shop page", null)
    expect(result.planApplied).toBe(true)
    expect(result.trace.phases.some((phase) => phase.phase === "planner")).toBe(true)
    expect(streamReply.calls[0]?.systemPrompt).toContain("Coffee shop landing page")
    expect(result.evaluation?.ok).toBe(true)
    expect(result.refinementRounds).toBe(0)
  })

  it("runs refinement rounds when HTML stays truncated", async () => {
    const fetchPlan = vi.fn().mockResolvedValue(null)
    const streamReply = createStreamReply([TRUNCATED_HTML, TRUNCATED_HTML, TRUNCATED_HTML])
    const onRefinementRound = vi.fn()

    const result = await runBuildPipeline({
      priorHistory: [],
      userMessage: { role: "user", content: "Build a landing page" },
      baseSystemPrompt: "Base advisor prompt",
      experienceHint: "Always include script",
      fetchPlan,
      streamReply,
      onRefinementRound,
    })

    expect(streamReply.calls).toHaveLength(3)
    expect(onRefinementRound).toHaveBeenCalledTimes(2)
    expect(result.refinementRounds).toBe(2)
    expect(result.completedRounds).toHaveLength(3)
    expect(result.evaluation?.shouldRefine).toBe(true)
    expect(result.conversationHistory.filter((message) => message.role === "user")).toHaveLength(3)
  })

  it("continues when planner fetch fails", async () => {
    const fetchPlan = vi.fn().mockRejectedValue(new Error("Planner offline"))
    const streamReply = createStreamReply([COMPLETE_HTML])

    const result = await runBuildPipeline({
      priorHistory: [{ role: "assistant", content: "Earlier help" }],
      userMessage: { role: "user", content: "Build page" },
      baseSystemPrompt: "Base advisor prompt",
      experienceHint: null,
      fetchPlan,
      streamReply,
    })

    expect(result.planApplied).toBe(false)
    expect(result.evaluation?.ok).toBe(true)
    expect(streamReply.calls[0]?.historyLength).toBe(2)
  })
})

describe("runBuildPipeline + saveBuildHistory", () => {
  beforeEach(async () => {
    resetBuildHistoryStoreForTests()
    await clearBuildHistory()
  })

  it("persists a successful build to IndexedDB without React", async () => {
    const result = await runBuildPipeline({
      priorHistory: [],
      userMessage: { role: "user", content: "Build a coffee shop page" },
      baseSystemPrompt: "Base advisor prompt",
      experienceHint: null,
      fetchPlan: vi.fn().mockResolvedValue(samplePlan),
      streamReply: createStreamReply([COMPLETE_HTML]),
    })

    expect(result.evaluation?.ok).toBe(true)
    expect(result.artifact).toBeTruthy()

    const saved = await saveBuildHistory({
      sessionId: "session-test",
      userPrompt: "Build a coffee shop page",
      evaluation: result.evaluation!,
      trace: result.trace,
      htmlChars: result.artifact!.length,
      planSummary: result.trace.phases.find((phase) => phase.phase === "planner")?.detail,
    })

    expect(saved).not.toBeNull()

    const records = await listBuildHistory()
    expect(records).toHaveLength(1)
    expect(records[0]?.userPrompt).toBe("Build a coffee shop page")
    expect(records[0]?.evaluation.ok).toBe(true)
    expect(records[0]?.htmlChars).toBe(result.artifact!.length)
    expect(records[0]?.planSummary).toBe("Coffee shop landing page")
  })
})

describe("buildIncompleteHtmlError", () => {
  it("includes score and refinement count", () => {
    const message = buildIncompleteHtmlError(
      {
        ok: false,
        score: 0.55,
        issues: ["Dokument je useknutý — chýba </html>"],
        shouldRefine: true,
      },
      2,
    )

    expect(message).toContain("55%")
    expect(message).toContain("automatické doplnenia: 2")
    expect(message).toContain("</html>")
  })
})