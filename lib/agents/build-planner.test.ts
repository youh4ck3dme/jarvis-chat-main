import { beforeEach, describe, expect, it, vi } from "vitest"

const { generateObjectMock, createMistralMock } = vi.hoisted(() => ({
  generateObjectMock: vi.fn(),
  createMistralMock: vi.fn(() => (modelName: string) => modelName),
}))

vi.mock("ai", () => ({
  generateObject: generateObjectMock,
}))

vi.mock("@ai-sdk/mistral", () => ({
  createMistral: createMistralMock,
}))

import { planBuild } from "./build-planner"

describe("planBuild", () => {
  beforeEach(() => {
    generateObjectMock.mockReset()
    createMistralMock.mockClear()
  })

  it("returns heuristic plan for empty prompt without calling the model", async () => {
    const result = await planBuild("test-key", "   ")

    expect(result.latencyMs).toBe(0)
    expect(result.plan.mustHaveScript).toBe(true)
    expect(result.plan.sections.length).toBeGreaterThan(0)
    expect(generateObjectMock).not.toHaveBeenCalled()
  })

  it("returns normalized plan from generateObject", async () => {
    generateObjectMock.mockResolvedValue({
      object: {
        summary: "Coffee shop landing page",
        sections: ["hero", "menu", "contact"],
        primaryColor: "#111111",
        ctaLabel: "Order now",
        language: "EN",
        mustHaveScript: true,
      },
    })

    const result = await planBuild("test-key", "Build a coffee shop page", "Include script")

    expect(result.plan.summary).toBe("Coffee shop landing page")
    expect(result.plan.language).toBe("EN")
    const plannerCall = generateObjectMock.mock.calls[0]?.[0] as { prompt?: string }
    expect(plannerCall.prompt).toContain("Build a coffee shop page")
    expect(plannerCall.prompt).toContain("Include script")
    expect(createMistralMock).toHaveBeenCalledWith({ apiKey: "test-key" })
  })

  it("falls back to heuristic plan when generateObject fails", async () => {
    generateObjectMock.mockRejectedValue(new Error("Planner timeout"))

    const result = await planBuild("test-key", "Vytvor stránku pre kaviareň")

    expect(result.plan.language).toBe("SK")
    expect(result.plan.mustHaveScript).toBe(true)
    expect(result.plan.summary).toContain("kaviareň")
  })
})