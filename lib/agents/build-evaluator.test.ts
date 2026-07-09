import { describe, expect, it } from "vitest"

import { evaluateBuildArtifact, REFINE_SCORE_THRESHOLD } from "./build-evaluator"

const COMPLETE_HTML = `<!DOCTYPE html>
<html>
<head><style>body { margin: 0; }</style></head>
<body>
  <section id="hero"><h1>Hero</h1><button>Go</button></section>
  <section id="about"><p>About</p></section>
  <script>document.querySelector("button")?.addEventListener("click", () => {});</script>
</body>
</html>`

describe("evaluateBuildArtifact", () => {
  it("returns score 0 and shouldRefine for missing artifact", () => {
    const result = evaluateBuildArtifact(null)

    expect(result).toEqual({
      ok: false,
      score: 0,
      issues: ["Chýba HTML artifact"],
      shouldRefine: true,
    })
  })

  it("flags truncated HTML missing </html>", () => {
    const truncated = `<!DOCTYPE html><html><head><style>h1{}</style></head><body><main>Partial`

    const result = evaluateBuildArtifact(truncated)

    expect(result.ok).toBe(false)
    expect(result.shouldRefine).toBe(true)
    expect(result.issues).toContain("Dokument je useknutý — chýba </html>")
    expect(result.score).toBeLessThan(REFINE_SCORE_THRESHOLD)
  })

  it("flags HTML missing script", () => {
    const noScript = `<!DOCTYPE html><html><head><style>h1{}</style></head><body>
      <section id="a">A</section><section id="b">B</section>
    </body></html>`

    const result = evaluateBuildArtifact(noScript)

    expect(result.ok).toBe(false)
    expect(result.shouldRefine).toBe(true)
    expect(result.issues).toContain("Chýba <script> — buttony pravdepodobne nebudú fungovať")
  })

  it("accepts complete HTML with high score", () => {
    const result = evaluateBuildArtifact(COMPLETE_HTML)

    expect(result.ok).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(REFINE_SCORE_THRESHOLD)
    expect(result.shouldRefine).toBe(false)
    expect(result.issues).toHaveLength(0)
  })

  it("sets shouldRefine when score is below threshold", () => {
    const minimal = `<!DOCTYPE html><html><head></head><body><p>Only text</p></body></html>`

    const result = evaluateBuildArtifact(minimal)

    expect(result.score).toBeLessThan(REFINE_SCORE_THRESHOLD)
    expect(result.shouldRefine).toBe(true)
  })
})