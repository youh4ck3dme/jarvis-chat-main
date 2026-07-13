import { describe, expect, it } from "vitest"

import { compareSnapshotHtml } from "./snapshot-diff"

const BEFORE = `<!DOCTYPE html><html><body><h1>Hello</h1><p>One</p></body></html>`
const AFTER = `<!DOCTYPE html><html><body><h1>Hello</h1><p>Two</p><section>New</section></body></html>`

describe("compareSnapshotHtml", () => {
  it("summarizes text and DOM diffs between snapshots", () => {
    const result = compareSnapshotHtml(BEFORE, AFTER)

    expect(result.textSummary).toMatch(/added/)
    expect(result.textLines.some((line) => line.type === "add")).toBe(true)
    expect(result.textLines.some((line) => line.type === "remove")).toBe(true)
    expect(result.addedNodes + result.removedNodes).toBeGreaterThan(0)
  })

  it("handles empty inputs", () => {
    const result = compareSnapshotHtml("", "")
    expect(result.textSummary).toBe("0 added, 0 removed")
  })
})
