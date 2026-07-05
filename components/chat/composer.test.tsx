import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Composer, AI_MODELS } from "./composer"
import { MockAudio } from "../../vitest.setup"

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}))

vi.mock("./animated-orb", () => ({
  AnimatedOrb: () => <div data-testid="animated-orb" />,
}))

vi.mock("./audio-waveform", () => ({
  AudioWaveform: () => <div data-testid="audio-waveform" />,
}))

const defaultProps = {
  onSend: vi.fn(),
  onStop: vi.fn(),
  isStreaming: false,
  disabled: false,
  selectedModel: AI_MODELS[0].id,
  onModelChange: vi.fn(),
}

describe("Composer", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the message input", () => {
    render(<Composer {...defaultProps} />)

    expect(screen.getByRole("textbox", { name: "Message input" })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Type a message/i)).toBeInTheDocument()
  })

  it("submits typed text when the send button is clicked", async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()

    render(<Composer {...defaultProps} onSend={onSend} />)

    await user.type(screen.getByRole("textbox", { name: "Message input" }), "Hello composer")
    await user.click(screen.getByRole("button", { name: "Send message" }))

    expect(onSend).toHaveBeenCalledWith("Hello composer", undefined)
  })

  it("submits typed text when Enter is pressed", async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()

    render(<Composer {...defaultProps} onSend={onSend} />)

    const input = screen.getByRole("textbox", { name: "Message input" })
    await user.type(input, "Enter to send")
    await user.keyboard("{Enter}")

    expect(onSend).toHaveBeenCalledWith("Enter to send", undefined)
  })

  it("does not submit on Shift+Enter", async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()

    render(<Composer {...defaultProps} onSend={onSend} />)

    const input = screen.getByRole("textbox", { name: "Message input" })
    await user.type(input, "Line one")
    await user.keyboard("{Shift>}{Enter}{/Shift}")

    expect(onSend).not.toHaveBeenCalled()
  })

  it("handles image attachment selection and submits image with text", async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    const imageDataUrl = "data:image/png;base64,ZmFrZQ=="

    class MockFileReader {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null
      readAsDataURL() {
        queueMicrotask(() => {
          this.onload?.({
            target: { result: imageDataUrl },
          } as ProgressEvent<FileReader>)
        })
      }
    }

    vi.stubGlobal("FileReader", MockFileReader)

    render(<Composer {...defaultProps} onSend={onSend} />)

    const fileInput = screen.getByLabelText("Upload image") as HTMLInputElement
    const file = new File(["fake"], "diagram.png", { type: "image/png" })

    await user.type(screen.getByRole("textbox", { name: "Message input" }), "Check this")
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByAltText("Uploaded image")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "Send message" }))

    expect(onSend).toHaveBeenCalledWith("Check this", imageDataUrl)
    vi.unstubAllGlobals()
  })

  it("calls onStop while streaming", async () => {
    const onStop = vi.fn()
    const user = userEvent.setup()

    render(<Composer {...defaultProps} isStreaming onStop={onStop} />)

    await user.click(screen.getByRole("button", { name: "Stop generating" }))

    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it("plays click audio when sending a message", async () => {
    const user = userEvent.setup()

    render(<Composer {...defaultProps} />)

    await user.type(screen.getByRole("textbox", { name: "Message input" }), "Sound check")
    await user.click(screen.getByRole("button", { name: "Send message" }))

    expect(MockAudio.instances.length).toBeGreaterThan(0)
    expect(MockAudio.instances.some((audio) => audio.play.mock.calls.length > 0)).toBe(true)
  })
})