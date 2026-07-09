import { describe, expect, it } from "vitest";

import {
  buildMindMapNodesFromPlan,
  getOrbitPosition,
  ORB_PLANNING_NODE_SEQUENCE,
} from "./orb-mind-map";

describe("orb-mind-map utils", () => {
  it("places nodes evenly on an orbit", () => {
    const first = getOrbitPosition(0, 4, 100);
    const second = getOrbitPosition(1, 4, 100);

    expect(first.y).toBeLessThan(0);
    expect(Math.hypot(second.x, second.y)).toBeCloseTo(100, 0);
  });

  it("builds nodes from a completed plan", () => {
    const nodes = buildMindMapNodesFromPlan({
      summary: "Landing page",
      sections: ["hero", "contact"],
      primaryColor: "#111111",
      ctaLabel: "Start",
      language: "EN",
      mustHaveScript: true,
    });

    expect(nodes.map((node) => node.label)).toEqual(["Hero", "Contact", "#111111", "Start"]);
  });

  it("exposes a default planning node sequence", () => {
    expect(ORB_PLANNING_NODE_SEQUENCE.length).toBeGreaterThanOrEqual(4);
  });
});