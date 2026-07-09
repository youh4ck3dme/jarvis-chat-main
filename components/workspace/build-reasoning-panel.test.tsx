import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { BuildReasoningPanel } from "./build-reasoning-panel"

describe("BuildReasoningPanel", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows empty state when no build has run", () => {
    render(<BuildReasoningPanel buildTrace={null} buildEvaluation={null} />)

    expect(screen.getByText(/Zatiaľ nebol build/i)).toBeInTheDocument()
    expect(screen.getByText("Plan")).toBeInTheDocument()
    expect(screen.getByText("Stream")).toBeInTheDocument()
  })

  it("renders timeline phases from build trace", () => {
    render(
      <BuildReasoningPanel
        buildTrace={{
          phases: [
            { phase: "builder", latencyMs: 1200, detail: "complete" },
            { phase: "evaluator", latencyMs: 4, detail: "score=0.85; ok=true" },
          ],
          totalLatencyMs: 1204,
          refinementRounds: 0,
        }}
        buildEvaluation={{ ok: true, score: 0.85, issues: [], shouldRefine: false }}
      />,
    )

    expect(screen.getByText("complete")).toBeInTheDocument()
    expect(screen.getByText("score=0.85; ok=true")).toBeInTheDocument()
    expect(screen.getByText("1.2 s")).toBeInTheDocument()
  })

  it("shows streaming progress entry", () => {
    render(<BuildReasoningPanel buildTrace={null} buildEvaluation={null} isStreaming />)

    expect(screen.getByText(/in progress/i)).toBeInTheDocument()
  })
})