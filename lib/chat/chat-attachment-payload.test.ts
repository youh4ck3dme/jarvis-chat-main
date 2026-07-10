import { describe, expect, it } from "vitest"

import { transformMessageForChatApi, transformMessagesForChatApi } from "./chat-attachment-payload"

describe("chat-attachment-payload", () => {
  it("transforms the latest user image into multimodal content", () => {
    const imageData = "data:image/jpeg;base64,ZmFrZQ=="

    const transformed = transformMessagesForChatApi([
      { role: "user", content: "Earlier", imageData: "data:image/png;base64,b2xk" },
      { role: "assistant", content: "Noted" },
      { role: "user", content: "Describe this", imageData },
    ])

    expect(transformed).toEqual([
      { role: "user", content: "Earlier" },
      { role: "assistant", content: "Noted" },
      {
        role: "user",
        content: [
          { type: "image", image: imageData },
          { type: "text", text: "Describe this" },
        ],
      },
    ])
  })

  it("transforms webp images for vision models", () => {
    const imageData = "data:image/webp;base64,ZmFrZQ=="
    const transformed = transformMessageForChatApi(
      { role: "user", content: "", imageData },
      0,
      0,
    )

    expect(transformed.content).toEqual([
      { type: "image", image: imageData },
      { type: "text", text: "Describe and analyze this image in detail." },
    ])
  })

  it("inlines html attachments as readable text for all providers", () => {
    const html = "<!doctype html><html><body><h1>Demo</h1></body></html>"
    const attachment = `data:text/html;base64,${btoa(html)}`

    const transformed = transformMessagesForChatApi([
      {
        role: "user",
        content: "Review markup",
        attachment,
        attachmentName: "landing.html",
      },
    ])

    expect(transformed[0]?.content).toContain("[Attached HTML file: landing.html]")
    expect(transformed[0]?.content).toContain("<h1>Demo</h1>")
    expect(transformed[0]?.content).toContain("Review markup")
  })

  it("sends pdf attachments as multimodal file parts", () => {
    const attachment = "data:application/pdf;base64,ZmFrZQ=="

    const transformed = transformMessagesForChatApi([
      { role: "user", content: "Summarize", attachment },
    ])

    expect(transformed[0]?.content).toEqual([
      { type: "file", data: "ZmFrZQ==", mimeType: "application/pdf" },
      { type: "text", text: "Summarize" },
    ])
  })

  it("collapses historical attachments to text placeholders", () => {
    const transformed = transformMessagesForChatApi([
      { role: "user", content: "", imageData: "data:image/png;base64,ZmFrZQ==" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "next" },
    ])

    expect(transformed[0]?.content).toBe("[User shared an image]")
    expect(transformed[2]?.content).toBe("next")
  })
})