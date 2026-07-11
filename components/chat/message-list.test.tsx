import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Message } from "./chat-shell"
import {
  INTRO_COOLDOWN_MS,
  INTRO_PLAYED_KEY,
  MessageList,
  markIntroPlayed,
  shouldPlayIntro,
} from "./message-list"
import { MockAudio } from "../../vitest.setup"

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}))

vi.mock("./animated-orb", () => ({
  AnimatedOrb: () => <div data-testid="animated-orb" />,
}))

vi.mock("./typing-indicator", () => ({
  TypingIndicator: () => <div data-testid="typing-indicator">Typing…</div>,
}))

const baseProps = {
  isStreaming: false,
  error: null,
  onRetry: vi.fn(),
  isLoaded: true,
}

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    role: "user",
    content: "Hello Jarvis",
    createdAt: new Date("2026-07-05T12:00:00Z"),
    ...overrides,
  }
}

describe("MessageList", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders user and assistant messages", () => {
    const messages: Message[] = [
      createMessage({ id: "user-1", role: "user", content: "Hello from user" }),
      createMessage({ id: "assistant-1", role: "assistant", content: "Hello from assistant" }),
    ]

    const { container } = render(<MessageList {...baseProps} messages={messages} />)

    expect(screen.getByText("Hello from user")).toBeInTheDocument()
    expect(screen.getByText("Hello from assistant")).toBeInTheDocument()

    const roleLabels = Array.from(container.querySelectorAll(".role-label")).map(
      (node) => node.textContent,
    )
    expect(roleLabels).toEqual(["You", "Assistant"])
  })

  it("shows the empty state when there are no messages", () => {
    render(<MessageList {...baseProps} messages={[]} />)

    expect(screen.getByText("Hi, my name is Jarvis")).toBeInTheDocument()
    expect(screen.getByText("Send a message to begin chatting with the AI assistant")).toBeInTheDocument()
  })

  it("shows a loading orb while chat history is hydrating", () => {
    render(<MessageList {...baseProps} messages={[]} isLoaded={false} />)

    expect(screen.getByTestId("animated-orb")).toBeInTheDocument()
    expect(screen.queryByText("Hi, my name is Jarvis")).not.toBeInTheDocument()
  })

  it("keeps workspace landing static while history hydrates", () => {
    render(<MessageList {...baseProps} messages={[]} isLoaded={false} variant="workspace" />)

    const landing = screen.getByTestId("jarvis-empty-state")
    expect(landing).toBeInTheDocument()
    expect(landing).toHaveClass("jarvis-landing-static")
    expect(landing.querySelector(".orb-intro")).toBeNull()
    expect(landing.querySelector(".text-blur-intro")).toBeNull()
    expect(screen.getByText("Ahoj, som Jarvis")).toBeInTheDocument()
    expect(screen.getByTestId("animated-orb")).toBeInTheDocument()
  })

  it("does not play intro audio in workspace landing", () => {
    render(<MessageList {...baseProps} messages={[]} variant="workspace" />)

    expect(MockAudio.instances).toHaveLength(0)
    expect(screen.getByTestId("jarvis-empty-state")).toBeInTheDocument()
  })

  describe("intro autoplay cooldown", () => {
    it("plays intro audio on first visit and records jarvis-intro-last-played", () => {
      render(<MessageList {...baseProps} messages={[]} variant="default" />)

      expect(MockAudio.instances).toHaveLength(1)
      expect(MockAudio.instances[0]?.play).toHaveBeenCalledTimes(1)
      expect(localStorage.getItem(INTRO_PLAYED_KEY)).not.toBeNull()
    })

    it("does not replay intro audio within the 1-hour cooldown window", () => {
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000
      localStorage.setItem(INTRO_PLAYED_KEY, String(thirtyMinutesAgo))

      render(<MessageList {...baseProps} messages={[]} variant="default" />)

      expect(MockAudio.instances).toHaveLength(0)
    })

    it("replays intro audio after the cooldown expires", () => {
      const twoHoursAgo = Date.now() - 2 * INTRO_COOLDOWN_MS
      localStorage.setItem(INTRO_PLAYED_KEY, String(twoHoursAgo))

      render(<MessageList {...baseProps} messages={[]} variant="default" />)

      expect(MockAudio.instances).toHaveLength(1)
      expect(MockAudio.instances[0]?.play).toHaveBeenCalledTimes(1)
    })

    it("does not play intro audio when persisted messages already exist", () => {
      render(
        <MessageList
          {...baseProps}
          messages={[createMessage({ role: "assistant", content: "Welcome back" })]}
        />,
      )

      expect(MockAudio.instances).toHaveLength(0)
    })
  })

  describe("shouldPlayIntro helper", () => {
    it("returns true on first visit", () => {
      expect(shouldPlayIntro()).toBe(true)
    })

    it("returns false when cooldown has not elapsed", () => {
      localStorage.setItem(INTRO_PLAYED_KEY, String(Date.now()))
      expect(shouldPlayIntro()).toBe(false)
    })

    it("returns true once cooldown has elapsed", () => {
      localStorage.setItem(INTRO_PLAYED_KEY, String(Date.now() - INTRO_COOLDOWN_MS))
      expect(shouldPlayIntro()).toBe(true)
    })

    it("markIntroPlayed stores a timestamp", () => {
      markIntroPlayed()
      const stored = localStorage.getItem(INTRO_PLAYED_KEY)
      expect(stored).not.toBeNull()
      expect(Number(stored)).toBeGreaterThan(0)
    })
  })
})