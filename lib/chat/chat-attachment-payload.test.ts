import { describe, expect, it } from "vitest"

import { transformMessagesForChatApi } from "./chat-attachment-payload"

describe("chat-attachment-payload", () => {
  it("transforms the latest image into multimodal content", () => {
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

  it("inlines html attachments as readable text for all providers", () => {
    const html = "<!doctype html><html><body><h1>Demo</h1></body></html>"
    const attachment = `data:text/html;base64,${btoa(html)}`

    const transformed = transformMessagesForChatApi([
      { role: "user", content: "Review markup", attachment },
    ])

    expect(transformed[0]?.content).toContain("[Attached HTML file]")
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
})