import { describe, expect, it } from "vitest"

import { extractExportableArtifacts } from "./assistant-artifact-export"

describe("assistant-artifact-export", () => {
  it("extracts html, image and pdf export options from assistant content", () => {
    const content = [
      "Here is your page:",
      "```html",
      "<!doctype html><html><body><h1>Jarvis</h1></body></html>",
      "```",
      "And a badge:",
      "data:image/png;base64,ZmFrZQ==",
    ].join("\n")

    const artifacts = extractExportableArtifacts(content)

    expect(artifacts.some((artifact) => artifact.kind === "html")).toBe(true)
    expect(artifacts.some((artifact) => artifact.kind === "image/png")).toBe(true)
    expect(artifacts.some((artifact) => artifact.kind === "pdf")).toBe(true)
  })
})