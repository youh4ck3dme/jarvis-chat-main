import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  JARVIS_ATTACHMENT_ACCEPT,
  classifyDataUrl,
  classifyMimeType,
  decodeDataUrl,
  extensionFromFileName,
  getDefaultAttachmentPrompt,
  isHeicFile,
  isHeicMime,
  isImageDataUrl,
  isSupportedAttachment,
  mimeFromFileName,
  readAttachmentFromFile,
  resolveFileMime,
  splitAttachmentPayload,
} from "./jarvis-attachments"

vi.mock("heic2any", () => ({
  default: vi.fn().mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" })),
}))

describe("jarvis-attachments", () => {
  const originalFileReader = globalThis.FileReader

  beforeEach(() => {
    class MockFileReader {
      result: string | ArrayBuffer | null = null
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null
      onerror: ((event: ProgressEvent<FileReader>) => void) | null = null

      readAsDataURL(blob: Blob) {
        queueMicrotask(() => {
          const mime = blob.type || "application/octet-stream"
          this.result = `data:${mime};base64,ZmFrZQ==`
          this.onload?.({ target: this } as unknown as ProgressEvent<FileReader>)
        })
      }
    }

    vi.stubGlobal("FileReader", MockFileReader)
  })

  afterEach(() => {
    vi.stubGlobal("FileReader", originalFileReader)
    vi.clearAllMocks()
  })

  it("exposes all supported formats in the file picker accept list", () => {
    for (const token of [".jpg", ".jpeg", ".png", ".webp", ".heic", ".pdf", ".html"]) {
      expect(JARVIS_ATTACHMENT_ACCEPT).toContain(token)
    }
  })

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
    expect(mimeFromFileName("photo.heic")).toBe("image/heic")
    expect(mimeFromFileName("sheet.PDF")).toBe("application/pdf")
    expect(extensionFromFileName("landing.page.HTML")).toBe("html")

    const file = new File(["x"], "photo.heic", { type: "" })
    expect(resolveFileMime(file)).toBe("image/heic")
    expect(isSupportedAttachment(file)).toBe(true)
    expect(isHeicFile(file)).toBe(true)
    expect(isHeicMime("image/heif")).toBe(true)
  })

  it("returns default prompts per attachment kind", () => {
    expect(getDefaultAttachmentPrompt("image")).toContain("image")
    expect(getDefaultAttachmentPrompt("pdf")).toContain("PDF")
    expect(getDefaultAttachmentPrompt("html")).toContain("HTML")
  })

  it("splits image and document attachments for chat storage", () => {
    expect(splitAttachmentPayload("data:image/jpeg;base64,ZmFrZQ==")).toEqual({
      imageData: "data:image/jpeg;base64,ZmFrZQ==",
    })
    expect(splitAttachmentPayload("data:image/webp;base64,ZmFrZQ==")).toEqual({
      imageData: "data:image/webp;base64,ZmFrZQ==",
    })
    expect(splitAttachmentPayload("data:application/pdf;base64,ZmFrZQ==")).toEqual({
      fileAttachment: "data:application/pdf;base64,ZmFrZQ==",
    })
    expect(splitAttachmentPayload("data:text/html;base64,PGgxPk9rPC9oMT4=")).toEqual({
      fileAttachment: "data:text/html;base64,PGgxPk9rPC9oMT4=",
    })
    expect(isImageDataUrl("data:image/png;base64,ZmFrZQ==")).toBe(true)
    expect(isImageDataUrl("data:application/pdf;base64,ZmFrZQ==")).toBe(false)
  })

  it("decodes html data urls to text", () => {
    const html = "<main>Jarvis</main>"
    const encoded = `data:text/html;base64,${btoa(html)}`
    expect(classifyDataUrl(encoded)).toBe("html")
    expect(decodeDataUrl(encoded).textContent).toBe(html)
  })

  it.each([
    ["diagram.png", "image/png", "image"],
    ["photo.jpg", "image/jpeg", "image"],
    ["icon.webp", "image/webp", "image"],
    ["brief.pdf", "application/pdf", "pdf"],
    ["index.html", "text/html", "html"],
  ] as const)("reads %s attachments from file input", async (name, type, kind) => {
    const file = new File(["payload"], name, { type })
    const parsed = await readAttachmentFromFile(file)

    expect(parsed.kind).toBe(kind)
    expect(parsed.fileName).toBe(name)
    expect(parsed.dataUrl.startsWith("data:")).toBe(true)
    if (kind === "html") {
      expect(classifyDataUrl(parsed.dataUrl)).toBe("html")
    }
  })

  it("converts HEIC uploads to JPEG data urls", async () => {
    const file = new File(["heic"], "iphone.heic", { type: "image/heic" })
    const parsed = await readAttachmentFromFile(file)

    expect(parsed.kind).toBe("image")
    expect(parsed.fileName).toBe("iphone.jpg")
    expect(parsed.dataUrl.startsWith("data:image/jpeg")).toBe(true)
  })

  it("rejects unsupported files", async () => {
    const file = new File(["txt"], "notes.txt", { type: "text/plain" })
    await expect(readAttachmentFromFile(file)).rejects.toThrow("Unsupported attachment format")
  })
})