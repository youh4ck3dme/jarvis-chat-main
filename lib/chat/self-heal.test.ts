import { describe, expect, it } from "vitest"

import type { PreviewConsoleEntry, PreviewErrorEntry, PreviewNetworkEntry } from "@/copied-from-visual-html/lib/preview-console-bridge"

import {
  buildSelfHealPrompt,
  canRequestSelfHeal,
  extractRelevantHtmlSlice,
  isCspViolationMessage,
  MAX_SELF_HEAL_ATTEMPTS,
  selfHealIssueFromConsole,
  selfHealIssueFromError,
  selfHealIssueFromNetwork,
} from "./self-heal"

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Demo</title></head>
<body>
<h1>Hello</h1>
<script>
console.log("boot");
throw new Error("boom");
</script>
</body>
</html>`

describe("self-heal", () => {
  it("detects CSP violation messages", () => {
    expect(isCspViolationMessage("Refused to execute inline script because it violates the following Content Security Policy directive")).toBe(true)
    expect(isCspViolationMessage("all good")).toBe(false)
  })

  it("maps runtime errors and console errors", () => {
    const runtime: PreviewErrorEntry = {
      id: "e1",
      kind: "error",
      message: "boom",
      source: "inline",
      lineno: 8,
      colno: 1,
      ts: 1,
    }

    expect(selfHealIssueFromError(runtime).kind).toBe("runtime-error")

    const consoleEntry: PreviewConsoleEntry = {
      id: "c1",
      level: "error",
      args: ["TypeError: x is not a function"],
      ts: 2,
    }

    expect(selfHealIssueFromConsole(consoleEntry)?.kind).toBe("console-error")
  })

  it("maps network failures", () => {
    const network: PreviewNetworkEntry = {
      id: "n1",
      kind: "fetch",
      method: "GET",
      url: "/api/missing",
      status: 404,
      ts: 3,
    }

    expect(selfHealIssueFromNetwork(network)?.message).toContain("404")
  })

  it("extracts script slice when no line number is available", () => {
    const issue = selfHealIssueFromError({
      id: "e2",
      kind: "unhandledrejection",
      message: "reject",
      ts: 4,
    })

    const slice = extractRelevantHtmlSlice(SAMPLE_HTML, issue)
    expect(slice).toContain("<script>")
    expect(slice).toContain("throw new Error")
  })

  it("builds a builder-friendly follow-up prompt", () => {
    const issue = selfHealIssueFromError({
      id: "e3",
      kind: "error",
      message: "boom",
      lineno: 8,
      ts: 5,
    })

    const prompt = buildSelfHealPrompt(issue, SAMPLE_HTML)
    expect(prompt).toContain("Oprav aktuálny HTML artefakt")
    expect(prompt).toContain("Typ: runtime-error")
    expect(prompt).toContain("```html")
    expect(prompt).toContain("throw new Error")
  })

  it("enforces retry limit helpers", () => {
    expect(canRequestSelfHeal(0)).toBe(true)
    expect(canRequestSelfHeal(MAX_SELF_HEAL_ATTEMPTS - 1)).toBe(true)
    expect(canRequestSelfHeal(MAX_SELF_HEAL_ATTEMPTS)).toBe(false)
  })
})
