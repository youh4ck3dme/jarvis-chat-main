import { beforeEach, describe, expect, it } from "vitest"

import {
  clearPinnedComponents,
  cosineSimilarity,
  formatFewShotExamples,
  pinComponent,
  resetComponentLibraryForTests,
  retrieveTopK,
  setEmbedFnForTests,
  unpinComponent,
} from "./local-embedding-index"

function hashEmbed(text: string): number[] {
  const vector = new Array(8).fill(0)
  for (let i = 0; i < text.length; i += 1) {
    const slot = i % vector.length
    vector[slot] = (vector[slot] + text.charCodeAt(i)) % 97
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map((value) => value / norm)
}

describe("local-embedding-index", () => {
  beforeEach(async () => {
    resetComponentLibraryForTests()
    setEmbedFnForTests(async (text) => hashEmbed(text))
    await clearPinnedComponents()
  })

  it("computes cosine similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it("pins, retrieves top-k, and unpins components", async () => {
    const coffee = await pinComponent({
      buildHistoryId: "b1",
      userPrompt: "landing page for coffee shop espresso beans cafe",
      html: "<html><body><h1>Coffee Shop Landing</h1><p>Espresso beans cafe menu</p></body></html>",
    })
    await pinComponent({
      buildHistoryId: "b2",
      userPrompt: "portfolio for photographer",
      html: "<html><body><h1>Photos</h1></body></html>",
    })

    expect(coffee).not.toBeNull()
    const results = await retrieveTopK("coffee shop espresso cafe landing page", 2)
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((item) => item.buildHistoryId === "b1")).toBe(true)
    expect(results[0]?.score).toBeGreaterThan(0)
    await unpinComponent("b1")
    const afterUnpin = await retrieveTopK("coffee cafe landing", 2)
    expect(afterUnpin.every((item) => item.buildHistoryId !== "b1")).toBe(true)
  })

  it("formats few-shot prompt blocks", () => {
    const text = formatFewShotExamples([
      {
        userPrompt: "Landing for bakery",
        html: "<html><body>Bakery</body></html>",
      },
    ])

    expect(text).toContain("Local component library")
    expect(text).toContain("Landing for bakery")
    expect(text).toContain("```html")
  })
})
