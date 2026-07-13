import { describe, expect, it } from "vitest"

import {
  buildPlanSchema,
  createFallbackBuildPlan,
  detectBuildLanguage,
  formatPlanForSystemPrompt,
  normalizeBuildPlan,
} from "./build-plan-utils"

describe("build-plan-utils", () => {
  it("detects slovak and english prompts", () => {
    expect(detectBuildLanguage("Vytvor landing page s tlačidlom")).toBe("SK")
    expect(detectBuildLanguage("Build a landing page with CTA")).toBe("EN")
  })

  it("creates fallback plan with script requirement", () => {
    const plan = createFallbackBuildPlan("Vytvor landing page pre kaviareň")

    expect(plan.sections.length).toBeGreaterThan(0)
    expect(plan.mustHaveScript).toBe(true)
    expect(plan.language).toBe("SK")
  })

  it("detects czech when czech hints dominate", () => {
    expect(detectBuildLanguage("Děkuji, vytvoř stránku s tlačítko a barva")).toBe("CZ")
  })

  it("normalizes planner schema output", () => {
    const parsed = buildPlanSchema.parse({
      summary: " Landing page ",
      sections: ["hero", "contact"],
      language: "EN",
      mustHaveScript: true,
    })

    expect(normalizeBuildPlan(parsed)).toEqual({
      summary: "Landing page",
      sections: ["hero", "contact"],
      primaryColor: undefined,
      ctaLabel: undefined,
      language: "EN",
      mustHaveScript: true,
    })
  })

  it("rejects invalid planner schema payloads", () => {
    expect(() =>
      buildPlanSchema.parse({
        summary: "",
        sections: [],
        language: "EN",
      }),
    ).toThrow()
  })

  it("formats plan block for system prompt", () => {
    const plan = createFallbackBuildPlan("Coffee shop site")
    const formatted = formatPlanForSystemPrompt(plan, "Always include <script>.")

    expect(formatted).toContain("Build according to this plan")
    expect(formatted).toContain("Coffee shop site")
    expect(formatted).toContain("Experience hint")
    expect(formatted).toContain("Always include <script>.")
    expect(formatted).toContain("<!-- page:index -->")
    expect(formatted).toContain("Multi-page site")
  })
})