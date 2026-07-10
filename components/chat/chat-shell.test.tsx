import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { COMPLETE_HTML } from "@/lib/agents/__fixtures__/html-samples"
import type { PlannerResult } from "@/types/build"

import { ChatShell } from "./chat-shell"

const samplePlan: PlannerResult = {
  plan: {
    summary: "Smoke test landing page",
    sections: ["hero"],
    primaryColor: "#111111",
    ctaLabel: "Start",
    language: "EN",
    mustHaveScript: true,
  },
  latencyMs: 42,
}

function createStreamResponse(content: string): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(content))
      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  })
}

vi.mock("next/dynamic", () => ({
  default: () => {
    const MemoryPanel = () => <div data-testid="memory-panel" />
    return MemoryPanel
  },
}))

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}))

vi.mock("@/lib/memory", () => ({
  extractFromMessage: vi.fn().mockResolvedValue(undefined),
  updateConversationSummary: vi.fn().mockResolvedValue(undefined),
  clearConversationMemory: vi.fn().mockResolvedValue(undefined),
  buildAICcontext: vi.fn().mockResolvedValue({ systemPrompt: "" }),
}))

vi.mock("@/copied-from-visual-html/components/jarvis/jarvis-preview-panel", () => ({
  JarvisPreviewPanel: () => <div data-testid="jarvis-preview" />,
}))

vi.mock("./animated-orb", () => ({
  AnimatedOrb: () => <div data-testid="animated-orb" />,
}))

vi.mock("./audio-waveform", () => ({
  AudioWaveform: () => <div data-testid="audio-waveform" />,
}))

describe("ChatShell", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    class ResizeObserverMock {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
    vi.stubGlobal("fetch", fetchMock)

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes("/api/build/plan")) {
        return new Response(JSON.stringify({ success: true, data: samplePlan }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }

      if (url.includes("/api/chat")) {
        return createStreamResponse(COMPLETE_HTML)
      }

      return new Response("Not found", { status: 404 })
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it(
    "chat mode: sends a normal message without invoking the build pipeline",
    async () => {
    const user = userEvent.setup()

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes("/api/chat")) {
        return createStreamResponse("Ahoj! Ako ti môžem pomôcť?")
      }

      return new Response("Not found", { status: 404 })
    })

    render(<ChatShell />)

    await waitFor(() => {
      expect(screen.getByText("Ahoj, som Jarvis")).toBeInTheDocument()
    })

    const input = screen.getByRole("textbox", { name: "Message input" })
    fireEvent.change(input, { target: { value: "Ahoj" } })
    await user.click(screen.getByRole("button", { name: "Send message" }))

    await waitFor(() => {
      expect(screen.getByText("Ahoj")).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText("Ahoj! Ako ti môžem pomôcť?")).toBeInTheDocument()
    })

    const planCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/api/build/plan"),
    )
    expect(planCalls).toHaveLength(0)
    },
    15000,
  )

  it("chat mode with build intent injects story beat before planner", async () => {
    localStorage.setItem("jarvis-builder-unlocked", "true")
    localStorage.setItem("jarvis-mode", "chat")

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/api/build/plan")) {
        return new Response(JSON.stringify({ success: true, data: samplePlan }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }
      if (url.includes("/api/chat")) {
        return createStreamResponse(COMPLETE_HTML)
      }
      return new Response("Not found", { status: 404 })
    })

    const user = userEvent.setup()
    render(<ChatShell />)

    await waitFor(() => {
      expect(screen.getByText("Ahoj, som Jarvis")).toBeInTheDocument()
    })

    const input = screen.getByRole("textbox", { name: "Message input" })
    fireEvent.change(input, { target: { value: "urob mi landing page pre kaviareň" } })
    await user.click(screen.getByRole("button", { name: "Send message" }))

    await waitFor(() => {
      expect(screen.getByText(/rozložím v hlave/i)).toBeInTheDocument()
    })
  })

  it("chat mode with build intent auto-starts planner when builder is unlocked", async () => {
    localStorage.setItem("jarvis-builder-unlocked", "true")
    localStorage.setItem("jarvis-mode", "chat")

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes("/api/build/plan")) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        return new Response(JSON.stringify({ success: true, data: samplePlan }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }

      if (url.includes("/api/chat")) {
        return createStreamResponse(COMPLETE_HTML)
      }

      return new Response("Not found", { status: 404 })
    })

    const user = userEvent.setup()
    render(<ChatShell />)

    await waitFor(() => {
      expect(screen.getByText("Ahoj, som Jarvis")).toBeInTheDocument()
    })

    const input = screen.getByRole("textbox", { name: "Message input" })
    fireEvent.change(input, { target: { value: "urob mi landing page pre kaviareň" } })
    await user.click(screen.getByRole("button", { name: "Send message" }))

    await waitFor(
      () => {
        expect(screen.getByTestId("storyboard-strip")).toBeInTheDocument()
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/build/plan",
          expect.objectContaining({ method: "POST" }),
        )
      },
      { timeout: 5000 },
    )
  })

  it("chat mode on mobile stays in chat view while streaming casual messages", async () => {
    vi.stubGlobal(
      "matchMedia",
      (query: string) =>
        ({
          matches: query.includes("767"),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList,
    )

    let resolveStream: (() => void) | undefined
    const streamStarted = new Promise<void>((resolve) => {
      resolveStream = resolve
    })

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/chat")) {
        await streamStarted
        return createStreamResponse("Ahoj! Ako ti môžem pomôcť?")
      }
      return new Response("Not found", { status: 404 })
    })

    const user = userEvent.setup()
    render(<ChatShell />)

    await waitFor(() => {
      expect(screen.getByText("Ahoj, som Jarvis")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByRole("textbox", { name: "Message input" }), {
      target: { value: "ahoj" },
    })
    await user.click(screen.getByRole("button", { name: "Send message" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Stop generating" })).toBeInTheDocument()
    })

    expect(screen.queryByRole("button", { name: /Live Preview/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Generated Code/i })).not.toBeInTheDocument()

    resolveStream?.()

    await waitFor(() => {
      expect(screen.getByText("Ahoj! Ako ti môžem pomôcť?")).toBeInTheDocument()
    })

    expect(screen.queryByRole("button", { name: /Live Preview/i })).not.toBeInTheDocument()
  })

  it(
    "builder mode: sends a message and streams assistant HTML through the build pipeline",
    async () => {
    localStorage.setItem("jarvis-builder-unlocked", "true")
    localStorage.setItem("jarvis-mode", "builder")

    const user = userEvent.setup()

    render(<ChatShell />)

    await waitFor(() => {
      expect(screen.getByText("Ahoj, som Jarvis")).toBeInTheDocument()
    })

    const input = screen.getByRole("textbox", { name: "Message input" })
    fireEvent.change(input, { target: { value: "Build a landing page" } })
    await user.click(screen.getByRole("button", { name: "Send message" }))

    await waitFor(() => {
      expect(screen.getByText("Build a landing page")).toBeInTheDocument()
    })

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/build/plan",
          expect.objectContaining({ method: "POST" }),
        )
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/chat",
          expect.objectContaining({ method: "POST" }),
        )
      },
      { timeout: 5000 },
    )

    await waitFor(() => {
      expect(screen.getByText(/section id="hero"/i)).toBeInTheDocument()
    })

    expect(screen.getByTestId("jarvis-preview")).toBeInTheDocument()
    },
    15000,
  )
})