import { beforeEach, describe, expect, it } from "vitest"

import {
  clearBuildHistory,
  clearBuildHistoryForSession,
  countBuildHistory,
  createBuildHistoryRecord,
  listBuildHistory,
  resetBuildHistoryStoreForTests,
  saveBuildHistory,
} from "./build-history-store"

const sampleInput = (
  prompt: string,
  options?: { createdAt?: string; sessionId?: string },
) => ({
  userPrompt: prompt,
  sessionId: options?.sessionId,
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
  createdAt: options?.createdAt,
})

describe("build-history-store", () => {
  beforeEach(async () => {
    resetBuildHistoryStoreForTests()
    await clearBuildHistory()
  })

  it("creates a build history record with trace and evaluation", () => {
    const record = createBuildHistoryRecord({
      sessionId: "session-a",
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
    expect(record.sessionId).toBe("session-a")
    expect(record.htmlChars).toBe(2048)
    expect(record.evaluation.score).toBe(0.92)
    expect(record.planSummary).toBe("Coffee shop plan")
    expect(record.id).toBeTruthy()
    expect(record.createdAt).toBeTruthy()
  })

  it("saves and lists build history newest first", async () => {
    await saveBuildHistory(sampleInput("build-1", { createdAt: "2026-07-09T10:00:00.000Z" }))
    await saveBuildHistory(sampleInput("build-2", { createdAt: "2026-07-09T11:00:00.000Z" }))
    const latest = await saveBuildHistory(sampleInput("build-3", { createdAt: "2026-07-09T12:00:00.000Z" }))

    const records = await listBuildHistory({ limit: 10 })

    expect(records).toHaveLength(3)
    expect(records[0]?.userPrompt).toBe("build-3")
    expect(records[0]?.id).toBe(latest?.id)
    expect(records[2]?.userPrompt).toBe("build-1")
  })

  it("filters build history by session id", async () => {
    await saveBuildHistory(
      sampleInput("session-a-1", { sessionId: "session-a", createdAt: "2026-07-09T10:00:00.000Z" }),
    )
    await saveBuildHistory(
      sampleInput("session-b-1", { sessionId: "session-b", createdAt: "2026-07-09T11:00:00.000Z" }),
    )
    await saveBuildHistory(
      sampleInput("session-a-2", { sessionId: "session-a", createdAt: "2026-07-09T12:00:00.000Z" }),
    )

    const sessionARecords = await listBuildHistory({ sessionId: "session-a", limit: 10 })
    const sessionBRecords = await listBuildHistory({ sessionId: "session-b", limit: 10 })

    expect(sessionARecords).toHaveLength(2)
    expect(sessionARecords[0]?.userPrompt).toBe("session-a-2")
    expect(sessionBRecords).toHaveLength(1)
    expect(sessionBRecords[0]?.userPrompt).toBe("session-b-1")
  })

  it("counts build history per session", async () => {
    await saveBuildHistory(sampleInput("a-1", { sessionId: "session-a" }))
    await saveBuildHistory(sampleInput("a-2", { sessionId: "session-a" }))
    await saveBuildHistory(sampleInput("b-1", { sessionId: "session-b" }))

    expect(await countBuildHistory("session-a")).toBe(2)
    expect(await countBuildHistory("session-b")).toBe(1)
    expect(await countBuildHistory()).toBe(3)
  })

  it("trims history to the latest 50 records per session", async () => {
    for (let index = 0; index < 52; index += 1) {
      const seconds = String(index).padStart(2, "0")
      await saveBuildHistory(
        sampleInput(`build-${index}`, {
          sessionId: "session-a",
          createdAt: `2026-01-01T00:00:${seconds}.000Z`,
        }),
      )
    }

    const records = await listBuildHistory({ sessionId: "session-a", limit: 60 })

    expect(records).toHaveLength(50)
    expect(records[0]?.userPrompt).toBe("build-51")
    expect(records[49]?.userPrompt).toBe("build-2")
    expect(records.some((record) => record.userPrompt === "build-0")).toBe(false)
    expect(records.some((record) => record.userPrompt === "build-1")).toBe(false)
  }, 15000)

  it("keeps separate trim limits for different sessions", async () => {
    for (let index = 0; index < 3; index += 1) {
      await saveBuildHistory(sampleInput(`a-${index}`, { sessionId: "session-a" }))
      await saveBuildHistory(sampleInput(`b-${index}`, { sessionId: "session-b" }))
    }

    expect(await countBuildHistory("session-a")).toBe(3)
    expect(await countBuildHistory("session-b")).toBe(3)
  })

  it("clears all stored build history", async () => {
    await saveBuildHistory(sampleInput("build-to-clear", { createdAt: "2026-07-09T10:00:00.000Z" }))
    await clearBuildHistory()

    expect(await listBuildHistory()).toEqual([])
  })

  it("clears build history for a single session", async () => {
    await saveBuildHistory(sampleInput("a-1", { sessionId: "session-a" }))
    await saveBuildHistory(sampleInput("b-1", { sessionId: "session-b" }))

    await clearBuildHistoryForSession("session-a")

    expect(await listBuildHistory({ sessionId: "session-a" })).toEqual([])
    expect(await listBuildHistory({ sessionId: "session-b" })).toHaveLength(1)
  })
})