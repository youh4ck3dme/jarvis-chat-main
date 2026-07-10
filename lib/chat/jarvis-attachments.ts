export const JARVIS_ATTACHMENT_KINDS = ["image", "pdf", "html"] as const

export type JarvisAttachmentKind = (typeof JARVIS_ATTACHMENT_KINDS)[number]

export const JARVIS_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export const JARVIS_ATTACHMENT_MIME_TYPES = [
  ...JARVIS_IMAGE_MIME_TYPES,
  "image/heic",
  "image/heif",
  "application/pdf",
  "text/html",
] as const

export const JARVIS_ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.html,.htm,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,text/html"

const EXTENSION_MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
  html: "text/html",
  htm: "text/html",
}

const HEIC_EXTENSIONS = new Set(["heic", "heif"])

export function extensionFromFileName(fileName: string): string {
  const parts = fileName.trim().toLowerCase().split(".")
  return parts.length > 1 ? (parts.at(-1) ?? "") : ""
}

export function mimeFromFileName(fileName: string): string | null {
  const extension = extensionFromFileName(fileName)
  return EXTENSION_MIME_MAP[extension] ?? null
}

export function resolveFileMime(file: File): string {
  const trimmedType = file.type.trim().toLowerCase()
  if (trimmedType) return trimmedType
  return mimeFromFileName(file.name) ?? ""
}

export function isHeicMime(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase()
  return normalized === "image/heic" || normalized === "image/heif"
}

export function isHeicFile(file: File): boolean {
  const mime = resolveFileMime(file)
  if (isHeicMime(mime)) return true
  return HEIC_EXTENSIONS.has(extensionFromFileName(file.name))
}

export function classifyMimeType(mimeType: string): JarvisAttachmentKind | null {
  const normalized = mimeType.toLowerCase()
  if (JARVIS_IMAGE_MIME_TYPES.includes(normalized as (typeof JARVIS_IMAGE_MIME_TYPES)[number])) {
    return "image"
  }
  if (isHeicMime(normalized)) return "image"
  if (normalized === "application/pdf") return "pdf"
  if (normalized === "text/html") return "html"
  return null
}

export function isSupportedAttachment(file: File): boolean {
  return classifyMimeType(resolveFileMime(file)) !== null || isHeicFile(file)
}

export function classifyDataUrl(dataUrl: string): JarvisAttachmentKind | null {
  if (!dataUrl.startsWith("data:")) return null
  const mimeType = dataUrl.slice(5).split(";")[0]?.toLowerCase() ?? ""
  return classifyMimeType(mimeType)
}

export function isImageDataUrl(dataUrl: string): boolean {
  return classifyDataUrl(dataUrl) === "image"
}

export function getDefaultAttachmentPrompt(kind: JarvisAttachmentKind): string {
  switch (kind) {
    case "image":
      return "Describe and analyze this image in detail."
    case "pdf":
      return "Read and analyze this PDF document."
    case "html":
      return "Read and analyze this HTML file."
  }
}

export function decodeDataUrl(dataUrl: string): {
  mimeType: string
  base64Data: string
  textContent: string | null
} {
  const commaIndex = dataUrl.indexOf(",")
  if (commaIndex === -1) {
    return { mimeType: "", base64Data: "", textContent: null }
  }

  const prefix = dataUrl.slice(0, commaIndex)
  const payload = dataUrl.slice(commaIndex + 1)
  const mimeType = prefix.replace(/^data:/, "").split(";")[0]?.toLowerCase() ?? ""

  if (prefix.includes(";base64")) {
    const textContent =
      mimeType === "text/html"
        ? (() => {
            try {
              const binary = atob(payload)
              const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
              return new TextDecoder().decode(bytes)
            } catch {
              return null
            }
          })()
        : null

    return { mimeType, base64Data: payload, textContent }
  }

  try {
    return {
      mimeType,
      base64Data: "",
      textContent: decodeURIComponent(payload),
    }
  } catch {
    return { mimeType, base64Data: "", textContent: payload }
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read attachment blob"))
    reader.readAsDataURL(blob)
  })
}

function textToHtmlDataUrl(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return `data:text/html;base64,${btoa(binary)}`
}

async function convertHeicToJpeg(file: File): Promise<Blob> {
  const heic2any = (await import("heic2any")).default
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  })

  return Array.isArray(converted) ? converted[0] : converted
}

export async function readAttachmentFromFile(file: File): Promise<{
  dataUrl: string
  fileName: string
  kind: JarvisAttachmentKind
}> {
  if (!isSupportedAttachment(file)) {
    throw new Error("Unsupported attachment format")
  }

  if (isHeicFile(file)) {
    const jpegBlob = await convertHeicToJpeg(file)
    const dataUrl = await blobToDataUrl(jpegBlob)
    const baseName = file.name.replace(/\.(heic|heif)$/i, "") || "photo"
    return {
      dataUrl,
      fileName: `${baseName}.jpg`,
      kind: "image",
    }
  }

  const mimeType = resolveFileMime(file)
  const kind = classifyMimeType(mimeType)
  if (!kind) {
    throw new Error("Unsupported attachment format")
  }

  if (kind === "html") {
    const text = await file.text()
    return {
      dataUrl: textToHtmlDataUrl(text),
      fileName: file.name,
      kind,
    }
  }

  const dataUrl = await blobToDataUrl(file)
  return {
    dataUrl,
    fileName: file.name,
    kind,
  }
}

export function splitAttachmentPayload(attachment?: string): {
  imageData?: string
  fileAttachment?: string
} {
  if (!attachment) return {}

  const kind = classifyDataUrl(attachment)
  if (kind === "image") {
    return { imageData: attachment }
  }
  if (kind === "pdf" || kind === "html") {
    return { fileAttachment: attachment }
  }

  return {}
}

export const JARVIS_ATTACHMENT_SYSTEM_PROMPT = `## Attachments & file formats
Jarvis supports these attachment formats end-to-end:
- **Images:** JPEG, HEIC/HEIF (auto-converted to JPEG), PNG, WebP — analyze visually with precise detail.
- **Documents:** PDF — read structure, text, layout, and tables when possible.
- **Markup:** HTML — parse structure, semantics, accessibility, and scripts/styles.

When the user attaches a file, identify its format, summarize what you see, and answer in context.
When asked to **create or export** files, use the same formats:
- **HTML:** deliver a complete document inside a \`\`\`html fenced block.
- **Images:** when generating raster output, provide a valid \`data:image/jpeg\`, \`data:image/png\`, or \`data:image/webp\` URL or base64 block with the correct MIME type.
- **PDF:** provide print-ready HTML (complete \`<!DOCTYPE html>\` document) the user can save as PDF, or a structured markdown summary when a binary PDF cannot be emitted directly.
Always label outputs with the intended format (HTML / JPEG / PNG / WebP / PDF).`