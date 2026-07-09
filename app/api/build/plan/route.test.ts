import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { planBuildMock } = vi.hoisted(() => ({
  planBuildMock: vi.fn(),
}))

vi.mock("@/lib/agents/build-planner", () => ({
  planBuild: planBuildMock,
}))

import { POST } from "./route"

describe("POST /api/build/plan", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      MISTRAL_API_KEY: "test-mistral-key",
    }

    planBuildMock.mockReset()
    planBuildMock.mockResolvedValue({
      plan: {
        summary: "Coffee shop landing page",
        sections: ["hero", "menu", "contact"],
        primaryColor: "#111111",
        ctaLabel: "Reserve",
        language: "EN",
        mustHaveScript: true,
      },
      latencyMs: 180,
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("returns 400 when prompt is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/build/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    )

    expect(response.status).toBe(400)
  })

  it("returns planner result for valid prompt", async () => {
    const response = await POST(
      new Request("http://localhost/api/build/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Build a coffee shop page" }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        plan: expect.objectContaining({
          summary: "Coffee shop landing page",
          mustHaveScript: true,
        }),
        latencyMs: 180,
      },
    })
    expect(planBuildMock).toHaveBeenCalledWith(
      "test-mistral-key",
      "Build a coffee shop page",
      null,
    )
  })
})