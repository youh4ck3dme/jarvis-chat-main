import { describe, expect, it } from "vitest";

import { COMPLETE_HTML } from "@/lib/agents/__fixtures__/html-samples";

import { evaluateMobileReadiness } from "./build-mobile-validator";

describe("evaluateMobileReadiness", () => {
  it("passes HTML with viewport, media query and touch sizing", () => {
    const result = evaluateMobileReadiness(COMPLETE_HTML);
    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("flags missing responsive blocks", () => {
    const html = `<!DOCTYPE html><html><head></head><body><button>Go</button></body></html>`;
    const result = evaluateMobileReadiness(html);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.includes("@media"))).toBe(true);
    expect(result.issues.some((issue) => issue.includes("viewport"))).toBe(true);
  });

  it("flags oversized fixed widths", () => {
    const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"></head><style>@media (max-width:768px){}</style><body style="width:1200px"><button style="min-height:48px">Go</button></body></html>`;
    const result = evaluateMobileReadiness(html);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.includes("overflow"))).toBe(true);
  });
});