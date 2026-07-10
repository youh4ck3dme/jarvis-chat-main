import { describe, expect, it } from "vitest"

import {
  classifyDataUrl,
  classifyMimeType,
  decodeDataUrl,
  extensionFromFileName,
  isSupportedAttachment,
  resolveFileMime,
  splitAttachmentPayload,
} from "./jarvis-attachments"

describe("jarvis-attachments", () => {
  it("classifies supported mime types", () => {
    expect(classifyMimeType("image/jpeg")).toBe("image")
    expect(classifyMimeType("image/png")).toBe("image")
    expect(classifyMimeType("image/webp")).toBe("image")
    expect(classifyMimeType("image/heic")).toBe("image")
    expect(classifyMimeType("application/pdf")).toBe("pdf")
    expect(classifyMimeType("text/html")).toBe("html")
    expect(classifyMimeType("text/plain")).toBeNull()
  })

  it("resolves mime from extension when browser omits file.type", () => {
    const file = new File(["x"], "photo.heic", { type: "" })
    expect(resolveFileMime(file)).toBe("image/heic")
    expect(isSupportedAttachment(file)).toBe(true)
    expect(extensionFromFileName("landing.page.HTML")).toBe("html")
  })

  it("splits image and document attachments for chat storage", () => {
    expect(
      splitAttachmentPayload("data:image/webp;base64,ZmFrZQ=="),
    ).toEqual({ imageData: "data:image/webp;base64,ZmFrZQ==" })

    expect(
      splitAttachmentPayload("data:application/pdf;base64,ZmFrZQ=="),
    ).toEqual({ fileAttachment: "data:application/pdf;base64,ZmFrZQ==" })

    expect(
      splitAttachmentPayload("data:text/html;base64,PGgxPk9rPC9oMT4="),
    ).toEqual({ fileAttachment: "data:text/html;base64,PGgxPk9rPC9oMT4=" })
  })

  it("decodes html data urls to text", () => {
    const html = "<main>Jarvis</main>"
    const encoded = `data:text/html;base64,${btoa(html)}`
    expect(classifyDataUrl(encoded)).toBe("html")
    expect(decodeDataUrl(encoded).textContent).toBe(html)
  })
})