import { describe, expect, it } from "vitest";

import {
  formatSectionLabel,
  resolveStoryboardPlan,
  resolveStoryboardSections,
  storyboardStatusFromPlan,
} from "./storyboard-strip";

describe("storyboard-strip utils", () => {
  it("formats known section labels", () => {
    expect(formatSectionLabel("hero")).toBe("Hero");
    expect(formatSectionLabel("navigation")).toBe("Menu");
    expect(formatSectionLabel("contact")).toBe("Contact");
    expect(formatSectionLabel("customBlock")).toBe("CustomBlock");
  });

  it("falls back to default sections without a plan", () => {
    expect(resolveStoryboardSections(null)).toEqual([
      "hero",
      "navigation",
      "features",
      "contact",
      "footer",
    ]);
  });

  it("reconstructs storyboard plan from planner trace detail", () => {
    const plan = resolveStoryboardPlan(null, {
      phases: [{ phase: "planner", latencyMs: 120, detail: "Coffee shop landing page" }],
      totalLatencyMs: 120,
      refinementRounds: 0,
    });

    expect(plan?.summary).toBe("Coffee shop landing page");
    expect(resolveStoryboardSections(plan)).toEqual([
      "hero",
      "navigation",
      "features",
      "contact",
      "footer",
    ]);
  });

  it("builds a status line from a completed plan", () => {
    const status = storyboardStatusFromPlan({
      summary: "Coffee shop landing",
      sections: ["hero", "contact"],
      primaryColor: "#111111",
      ctaLabel: "Order",
      language: "EN",
      mustHaveScript: true,
    });

    expect(status).toContain("Coffee shop landing");
    expect(status).toContain("#111111");
    expect(status).toContain("Order");
  });
});