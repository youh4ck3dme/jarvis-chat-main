import { Logger } from "@/lib/logger"

const DEFAULT_WIDTH = 320
const DEFAULT_HEIGHT = 180

function waitForIframeLoad(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    if (iframe.contentDocument?.readyState === "complete") {
      resolve()
      return
    }
    iframe.onload = () => resolve()
  })
}

/**
 * Capture a thumbnail for a build HTML artifact.
 * Uses an offscreen iframe with `allow-same-origin` only (no scripts) so
 * html2canvas can read the DOM without enabling sandbox script execution.
 */
export async function captureHtmlThumbnail(
  html: string,
  options?: { width?: number; height?: number },
): Promise<string | null> {
  if (typeof document === "undefined" || !html.trim()) {
    return null
  }

  const width = options?.width ?? DEFAULT_WIDTH
  const height = options?.height ?? DEFAULT_HEIGHT
  const iframe = document.createElement("iframe")
  iframe.setAttribute("sandbox", "allow-same-origin")
  iframe.setAttribute("aria-hidden", "true")
  iframe.tabIndex = -1
  iframe.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${width}px`,
    `height:${height}px`,
    "opacity:0",
    "pointer-events:none",
    "border:0",
  ].join(";")

  document.body.appendChild(iframe)

  try {
    iframe.srcdoc = html
    await waitForIframeLoad(iframe)
    await new Promise((resolve) => window.setTimeout(resolve, 40))

    const doc = iframe.contentDocument
    const body = doc?.body
    if (!body) {
      return null
    }

    const { default: html2canvas } = await import("html2canvas")
    const canvas = await html2canvas(body, {
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scale: 1,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: false,
    })

    return canvas.toDataURL("image/jpeg", 0.72)
  } catch (error) {
    Logger.warn("Failed to capture HTML thumbnail", { error: String(error) })
    return null
  } finally {
    iframe.remove()
  }
}
