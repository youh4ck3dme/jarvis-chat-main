import { beforeEach, describe, expect, it } from "vitest"

import {
  clearBuildHistory,
  createBuildHistoryRecord,
  listBuildHistory,
  resetBuildHistoryStoreForTests,
  saveBuildHistory,
} from "./build-history-store"

const sampleInput = (prompt: string, createdAt?: string) => ({
  userPrompt: prompt,
  evaluation: {
    ok: true,
    score: 0.9,
    issues: [] as string[],
    shouldRefine: false,
  },
  trace: {
    phases: [{ phase: "builder" as const, latencyMs: 100, detail: "complete" }],
    totalLatencyMs: 100,
    refinementRounds: 0,
  },
  htmlChars: 1024,
  createdAt,
})

describe("build-history-store", () => {
  beforeEach(async () => {
    resetBuildHistoryStoreForTests()
    await clearBuildHistory()
  })

  it("creates a build history record with trace and evaluation", () => {
    const record = createBuildHistoryRecord({
      userPrompt: "Build coffee shop landing page",
      evaluation: {
        ok: true,
        score: 0.92,
        issues: [],
        shouldRefine: false,
      },
      trace: {
        phases: [{ phase: "planner", latencyMs: 120, detail: "Coffee shop plan" }],
        totalLatencyMs: 120,
        refinementRounds: 0,
      },
      htmlChars: 2048,
      planSummary: "Coffee shop plan",
    })

    expect(record.userPrompt).toContain("coffee shop")
    expect(record.htmlChars).toBe(2048)
    expect(record.evaluation.score).toBe(0.92)
    expect(record.planSummary).toBe("Coffee shop plan")
    expect(record.id).toBeTruthy()
    expect(record.createdAt).toBeTruthy()
  })

  it("saves and lists build history newest first", async () => {
    await saveBuildHistory(sampleInput("build-1", "2026-07-09T10:00:00.000Z"))
    await saveBuildHistory(sampleInput("build-2", "2026-07-09T11:00:00.000Z"))
    const latest = await saveBuildHistory(sampleInput("build-3", "2026-07-09T12:00:00.000Z"))

    const records = await listBuildHistory(10)

    expect(records).toHaveLength(3)
    expect(records[0]?.userPrompt).toBe("build-3")
    expect(records[0]?.id).toBe(latest?.id)
    expect(records[2]?.userPrompt).toBe("build-1")
  })

  it("trims history to the latest 50 records", async () => {
    for (let index = 0; index < 52; index += 1) {
      const seconds = String(index).padStart(2, "0")
      await saveBuildHistory(
        sampleInput(`build-${index}`, `2026-01-01T00:00:${seconds}.000Z`),
      )
    }

    const records = await listBuildHistory(60)

    expect(records).toHaveLength(50)
    expect(records[0]?.userPrompt).toBe("build-51")
    expect(records[49]?.userPrompt).toBe("build-2")
    expect(records.some((record) => record.userPrompt === "build-0")).toBe(false)
    expect(records.some((record) => record.userPrompt === "build-1")).toBe(false)
  }, 15000)

  it("clears all stored build history", async () => {
    await saveBuildHistory(sampleInput("build-to-clear", "2026-07-09T10:00:00.000Z"))
    await clearBuildHistory()

    expect(await listBuildHistory()).toEqual([])
  })
})