import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import {
  BuildMetrics,
  formatCharCount,
  formatLatency,
  formatPercent,
  MetricTile,
  StrategyBadge,
} from "./build-metrics"

describe("build-metrics", () => {
  afterEach(() => {
    cleanup()
  })

  it("formats latency for sub-second and second values", () => {
    expect(formatLatency(0)).toBe("—")
    expect(formatLatency(420)).toBe("420 ms")
    expect(formatLatency(2500)).toBe("2.5 s")
    expect(formatLatency(125000)).toBe("2 min 5 s")
  })

  it("formats percent and char count", () => {
    expect(formatPercent(0.73, 0)).toBe("73%")
    expect(formatCharCount(0)).toBe("—")
    expect(formatCharCount(1234)).toBe(`${(1234).toLocaleString()} chars`)
  })

  it("renders metric tiles and badges", () => {
    render(
      <div>
        <MetricTile label="Latency" value="900 ms" />
        <StrategyBadge label="Stream" active />
        <BuildMetrics htmlChars={1024} latencyMs={900} refinementRounds={1} />
      </div>,
    )

    expect(screen.getByText("Latency")).toBeInTheDocument()
    expect(screen.getByText(/1[\s,]024 chars/)).toBeInTheDocument()
    expect(screen.getByText("Stream")).toBeInTheDocument()
    expect(screen.getAllByText("900 ms").length).toBeGreaterThan(0)
    expect(screen.getByText("Refinements").nextElementSibling).toHaveTextContent("1")
  })
})