export type ExportableArtifactKind = "html" | "image/jpeg" | "image/png" | "image/webp" | "pdf"

export type ExportableArtifact = {
  kind: ExportableArtifactKind
  label: string
  content: string
}

const HTML_FENCE_RE = /```html\s*([\s\S]*?)```/gi
const IMAGE_DATA_URL_RE = /data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+/gi

export function extractHtmlArtifacts(content: string): string[] {
  const matches: string[] = []
  for (const match of content.matchAll(HTML_FENCE_RE)) {
    const html = match[1]?.trim()
    if (html) matches.push(html)
  }
  return matches
}

export function extractImageDataUrls(content: string): string[] {
  return [...content.matchAll(IMAGE_DATA_URL_RE)].map((match) => match[0])
}

export function extractExportableArtifacts(content: string): ExportableArtifact[] {
  const artifacts: ExportableArtifact[] = []

  const htmlBlocks = extractHtmlArtifacts(content)
  htmlBlocks.forEach((html, index) => {
    artifacts.push({
      kind: "html",
      label: htmlBlocks.length > 1 ? `page-${index + 1}.html` : "artifact.html",
      content: html,
    })
  })

  const images = extractImageDataUrls(content)
  images.forEach((dataUrl, index) => {
    const mime = dataUrl.slice(5, dataUrl.indexOf(";"))
    const extension = mime.split("/")[1] ?? "img"
    artifacts.push({
      kind: mime as ExportableArtifactKind,
      label: images.length > 1 ? `image-${index + 1}.${extension}` : `image.${extension}`,
      content: dataUrl,
    })
  })

  if (htmlBlocks.length > 0) {
    artifacts.push({
      kind: "pdf",
      label: "artifact.pdf",
      content: htmlBlocks[htmlBlocks.length - 1] ?? "",
    })
  }

  return artifacts
}

function triggerDownload(href: string, fileName: string): void {
  const anchor = document.createElement("a")
  anchor.href = href
  anchor.download = fileName
  anchor.click()
}

export function downloadArtifact(artifact: ExportableArtifact): void {
  if (typeof window === "undefined") return

  if (artifact.kind === "html") {
    const blob = new Blob([artifact.content], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    triggerDownload(url, artifact.label)
    URL.revokeObjectURL(url)
    return
  }

  if (artifact.kind.startsWith("image/")) {
    triggerDownload(artifact.content, artifact.label)
    return
  }

  if (artifact.kind === "pdf") {
    printHtmlAsPdf(artifact.content, artifact.label.replace(/\.pdf$/i, ""))
  }
}

export function printHtmlAsPdf(html: string, title: string): void {
  if (typeof window === "undefined") return

  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.right = "0"
  iframe.style.bottom = "0"
  iframe.style.width = "0"
  iframe.style.height = "0"
  iframe.style.border = "0"
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    return
  }

  doc.open()
  doc.write(html)
  doc.close()
  doc.title = title

  const cleanup = () => iframe.remove()
  win.addEventListener("afterprint", cleanup, { once: true })
  window.setTimeout(() => {
    win.focus()
    win.print()
  }, 250)
}