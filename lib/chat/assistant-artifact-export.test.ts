import { afterEach, describe, expect, it, vi } from "vitest"

import {
  downloadArtifact,
  extractExportableArtifacts,
  extractHtmlArtifacts,
  extractImageDataUrls,
  printHtmlAsPdf,
} from "./assistant-artifact-export"

describe("assistant-artifact-export", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ""
  })

  it("extracts html code fences", () => {
    const content = "```html\n<h1>One</h1>\n```\nLater\n```html\n<h1>Two</h1>\n```"
    expect(extractHtmlArtifacts(content)).toEqual(["<h1>One</h1>", "<h1>Two</h1>"])
  })

  it("extracts jpeg, png and webp data urls", () => {
    const content = [
      "data:image/jpeg;base64,ZmFrZQ==",
      "data:image/png;base64,ZmFrZQ==",
      "data:image/webp;base64,ZmFrZQ==",
    ].join("\n")

    expect(extractImageDataUrls(content)).toHaveLength(3)
  })

  it("extracts html, image and pdf export options from assistant content", () => {
    const content = [
      "Here is your page:",
      "```html",
      "<!doctype html><html><body><h1>Jarvis</h1></body></html>",
      "```",
      "And a badge:",
      "data:image/png;base64,ZmFrZQ==",
    ].join("\n")

    const artifacts = extractExportableArtifacts(content)

    expect(artifacts.some((artifact) => artifact.kind === "html")).toBe(true)
    expect(artifacts.some((artifact) => artifact.kind === "image/png")).toBe(true)
    expect(artifacts.some((artifact) => artifact.kind === "pdf")).toBe(true)
  })

  it("downloads html artifacts via blob urls", () => {
    const click = vi.fn()
    const createObjectURL = vi.fn().mockReturnValue("blob:artifact")
    const revokeObjectURL = vi.fn()

    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "a") {
        return { click, download: "" } as unknown as HTMLAnchorElement
      }
      return document.createElementNS("http://www.w3.org/1999/xhtml", tagName)
    })
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    })

    downloadArtifact({
      kind: "html",
      label: "artifact.html",
      content: "<h1>Jarvis</h1>",
    })

    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:artifact")
  })

  it("opens print dialog for pdf exports", () => {
    vi.useFakeTimers()

    const iframe = document.createElement("iframe")
    const print = vi.fn()
    const write = vi.fn()

    Object.defineProperty(iframe, "contentWindow", {
      configurable: true,
      value: {
        focus: vi.fn(),
        print,
        addEventListener: vi.fn(),
      },
    })
    Object.defineProperty(iframe, "contentDocument", {
      configurable: true,
      value: {
        open: vi.fn(),
        write,
        close: vi.fn(),
        title: "",
      },
    })

    vi.spyOn(document, "createElement").mockReturnValue(iframe)

    printHtmlAsPdf("<h1>Jarvis</h1>", "artifact")
    vi.runAllTimers()

    expect(write).toHaveBeenCalledWith("<h1>Jarvis</h1>")
    expect(print).toHaveBeenCalled()

    vi.useRealTimers()
  })
})