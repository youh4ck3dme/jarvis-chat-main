import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { Message } from "./chat-shell"
import { MessageBubble } from "./message-bubble"

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}))

vi.mock("./animated-orb", () => ({
  AnimatedOrb: () => <div data-testid="animated-orb" />,
}))

vi.mock("./markdown-renderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}))

vi.mock("@/lib/chat/assistant-artifact-export", () => ({
  extractExportableArtifacts: vi.fn(() => [
    { kind: "html", label: "artifact.html", content: "<h1>Jarvis</h1>" },
    { kind: "image/png", label: "image.png", content: "data:image/png;base64,ZmFrZQ==" },
    { kind: "pdf", label: "artifact.pdf", content: "<h1>Jarvis</h1>" },
  ]),
  downloadArtifact: vi.fn(),
}))

const baseMessage: Message = {
  id: "m1",
  role: "assistant",
  content: "```html\n<h1>Jarvis</h1>\n```",
  createdAt: new Date("2026-07-10T12:00:00.000Z"),
}

describe("MessageBubble attachments", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("shows attachment kind on user document uploads", () => {
    const message: Message = {
      id: "u1",
      role: "user",
      content: "Review this",
      createdAt: new Date("2026-07-10T12:00:00.000Z"),
      attachment: "data:text/html;base64,PGgxPk9rPC9oMT4=",
      attachmentName: "landing.html",
    }

    render(<MessageBubble message={message} />)

    expect(screen.getByText("landing.html")).toBeInTheDocument()
    expect(screen.getByText("html")).toBeInTheDocument()
  })

  it("renders export actions for assistant artifacts", async () => {
    const { downloadArtifact } = await import("@/lib/chat/assistant-artifact-export")
    const user = userEvent.setup()

    render(<MessageBubble message={baseMessage} />)

    expect(screen.getByTitle("Download artifact.html")).toBeInTheDocument()
    expect(screen.getByTitle("Download image.png")).toBeInTheDocument()
    expect(screen.getByTitle("Download artifact.pdf")).toBeInTheDocument()

    await user.click(screen.getByTitle("Download artifact.html"))
    expect(downloadArtifact).toHaveBeenCalledWith({
      kind: "html",
      label: "artifact.html",
      content: "<h1>Jarvis</h1>",
    })
  })
})