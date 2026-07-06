import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { streamTextMock } = vi.hoisted(() => ({
  streamTextMock: vi.fn(),
}))

vi.mock("ai", () => ({
  streamText: streamTextMock,
}))

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
      error: expect.stringContaining("Mistral API key is missing"),
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
      error: "Invalid request: messages array required",
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
      error: "No valid messages to process",
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
      error: "Gateway unavailable",
    })
  })
})