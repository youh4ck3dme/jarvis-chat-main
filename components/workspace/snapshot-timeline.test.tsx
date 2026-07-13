import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { BuildHistoryRecord } from "@/lib/build-history/build-history-store"
import {
  SnapshotComparePanel,
  SnapshotTimeline,
} from "@/components/workspace/snapshot-timeline"

function makeRecord(
  id: string,
  prompt: string,
  createdAt: string,
  html = "<html><body>Hi</body></html>",
): BuildHistoryRecord {
  return {
    id,
    createdAt,
    userPrompt: prompt,
    html,
    htmlChars: html.length,
    thumbnailDataUrl: "data:image/jpeg;base64,abc",
    evaluation: {
      ok: true,
      score: 0.9,
      issues: [],
      shouldRefine: false,
    },
    trace: {
      phases: [],
      totalLatencyMs: 10,
      refinementRounds: 0,
    },
  }
}

describe("SnapshotTimeline", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders ordered snapshot cards and selects one", () => {
    const onSelect = vi.fn()
    const older = makeRecord("1", "First build", "2026-07-13T10:00:00.000Z")
    const newer = makeRecord("2", "Second build", "2026-07-13T11:00:00.000Z")

    render(
      <SnapshotTimeline
        records={[newer, older]}
        onSelect={onSelect}
      />,
    )

    expect(screen.getByTestId("snapshot-timeline")).toBeInTheDocument()
    const cards = screen.getAllByTestId("snapshot-timeline-card")
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent("First build")
    fireEvent.click(cards[1]!)
    expect(onSelect).toHaveBeenCalledWith(newer)
  })

  it("shows compare panel with before/after summary", () => {
    const before = makeRecord("a", "Before", "2026-07-13T10:00:00.000Z", "<html><body>A</body></html>")
    const after = makeRecord("b", "After", "2026-07-13T11:00:00.000Z", "<html><body>B</body></html>")

    render(
      <SnapshotComparePanel before={before} after={after} onClose={vi.fn()} />,
    )

    expect(screen.getByTestId("snapshot-compare-panel")).toBeInTheDocument()
    expect(screen.getByText(/Before vs after/i)).toBeInTheDocument()
  })
})
