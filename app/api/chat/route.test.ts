import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { streamTextMock } = vi.hoisted(() => ({
  streamTextMock: vi.fn(),
}))

vi.mock("ai", () => ({
  streamText: streamTextMock,
}))

import { ApiErrorCode } from "@/lib/error-codes"

import { POST } from "./route"

describe("POST /api/chat", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "test-openai-key",
      GEMINI_API_KEY: "test-google-key",
      ANTHROPIC_API_KEY: "test-anthropic-key",
      MISTRAL_API_KEY: "test-mistral-key",
    }

    streamTextMock.mockReset()
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () =>
        new Response("Hello from Jarvis", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("returns 401 when provider API key is missing", async () => {
    delete process.env.MISTRAL_API_KEY

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "mistral/mistral-large-latest",
          messages: [{ role: "user", content: "Hello" }],
        }),
      }),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: expect.stringContaining("Mistral API key is missing"),
      code: ApiErrorCode.UNAUTHORIZED,
    })
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it("returns 400 when messages are missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openai/gpt-4o" }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Invalid request: messages array required",
      code: ApiErrorCode.VALIDATION_ERROR,
    })
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it("returns 400 when all messages are empty", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "   " }],
        }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "No valid messages to process",
      code: ApiErrorCode.VALIDATION_ERROR,
    })
  })

  it("streams text responses for valid chat requests", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-4o",
          messages: [
            { role: "user", content: "Hello" },
            { role: "assistant", content: "Hi there" },
          ],
          system: "Custom persona prompt",
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toContain("text/plain")
    await expect(response.text()).resolves.toBe("Hello from Jarvis")

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.any(Object),
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there" },
        ],
        system: "Custom persona prompt",
      }),
    )
  })

  it("transforms the latest user image into multimodal content", async () => {
    const imageData = "data:image/png;base64,ZmFrZQ=="

    await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: "Earlier", imageData: "data:image/png;base64,b2xk" },
            { role: "assistant", content: "Noted" },
            { role: "user", content: "Describe this", imageData },
          ],
        }),
      }),
    )

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: "user", content: "Earlier" },
          { role: "assistant", content: "Noted" },
          {
            role: "user",
            content: [
              { type: "image", image: imageData },
              { type: "text", text: "Describe this" },
            ],
          },
        ],
      }),
    )
  })

  it("transforms pdf and html attachments for the latest user message", async () => {
    const html = "<!doctype html><html><body><h1>Demo</h1></body></html>"
    const htmlAttachment = `data:text/html;base64,${btoa(html)}`

    await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "Review",
              attachment: htmlAttachment,
              attachmentName: "landing.html",
            },
            { role: "assistant", content: "ok" },
            {
              role: "user",
              content: "Summarize",
              attachment: "data:application/pdf;base64,ZmFrZQ==",
            },
          ],
        }),
      }),
    )

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: "user", content: "Review" },
          { role: "assistant", content: "ok" },
          {
            role: "user",
            content: [
              { type: "file", data: "ZmFrZQ==", mimeType: "application/pdf" },
              { type: "text", text: "Summarize" },
            ],
          },
        ],
      }),
    )
  })

  it("inlines only the latest html attachment with full document content", async () => {
    const html = "<!doctype html><html><body><h1>Demo</h1></body></html>"
    const attachment = `data:text/html;base64,${btoa(html)}`

    await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "Review",
              attachment,
              attachmentName: "landing.html",
            },
          ],
        }),
      }),
    )

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: "user",
            content: expect.stringContaining("[Attached HTML file: landing.html]"),
          },
        ],
      }),
    )
    expect(streamTextMock.mock.calls[0]?.[0].messages[0].content).toContain("<h1>Demo</h1>")
  })

  it("injects attachment system guidance when no custom system prompt is provided", async () => {
    await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      }),
    )

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("Attachments & file formats"),
      }),
    )
  })

  it("returns 500 when streamText throws", async () => {
    streamTextMock.mockImplementation(() => {
      throw new Error("Gateway unavailable")
    })

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      }),
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Gateway unavailable",
      code: ApiErrorCode.INTERNAL_ERROR,
    })
  })
})