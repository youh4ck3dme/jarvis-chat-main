import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { RuntimeInspectorPanel } from "@/components/workspace/runtime-inspector-panel"

describe("RuntimeInspectorPanel", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders empty state without entries", () => {
    render(
      <RuntimeInspectorPanel
        state={{
          consoleEntries: [],
          errorEntries: [],
          networkEntries: [],
          navigationEntries: [],
          performanceEntries: [],
        }}
        onClear={vi.fn()}
      />,
    )

    expect(screen.getByTestId("runtime-inspector-panel")).toBeInTheDocument()
    expect(screen.getByText("No runtime signals yet")).toBeInTheDocument()
  })

  it("renders console and error rows and supports clear", () => {
    const onClear = vi.fn()

    render(
      <RuntimeInspectorPanel
        state={{
          consoleEntries: [
            {
              id: "c1",
              level: "log",
              args: ["hello inspector"],
              ts: Date.now(),
            },
          ],
          errorEntries: [
            {
              id: "e1",
              kind: "error",
              message: "Script failed",
              ts: Date.now(),
            },
          ],
          networkEntries: [],
          navigationEntries: [],
          performanceEntries: [],
        }}
        onClear={onClear}
      />,
    )

    expect(screen.getByTestId("inspector-console-row")).toHaveTextContent("hello inspector")
    expect(screen.getByTestId("inspector-error-row")).toHaveTextContent("Script failed")

    fireEvent.click(screen.getByRole("button", { name: "Clear inspector log" }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it("filters to network entries", () => {
    render(
      <RuntimeInspectorPanel
        state={{
          consoleEntries: [],
          errorEntries: [],
          networkEntries: [
            {
              id: "n1",
              kind: "fetch",
              method: "GET",
              url: "/missing",
              status: 404,
              durationMs: 10,
              ts: Date.now(),
            },
          ],
          navigationEntries: [],
          performanceEntries: [],
        }}
        onClear={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /Network/i }))
    expect(screen.getByTestId("inspector-network-row")).toHaveTextContent("/missing")
    expect(screen.queryByTestId("inspector-console-row")).not.toBeInTheDocument()
  })
})
