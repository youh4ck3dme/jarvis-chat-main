import { describe, expect, it } from "vitest"

import {
  isKnownPreviewMessageType,
  isTrustedPreviewMessage,
  normalizePreviewErrorMessage,
  normalizePreviewNetworkMessage,
  normalizePreviewPerformanceMessage,
  parsePreviewConsoleMessage,
  parsePreviewErrorMessage,
  parsePreviewNetworkMessage,
  parsePreviewPerformanceMessage,
} from "./preview-console-bridge"

describe("preview-console-bridge runtime messages", () => {
  it("parses console messages", () => {
    const entry = parsePreviewConsoleMessage({
      type: "pngto-preview-console",
      level: "warn",
      args: ["hello"],
      ts: 1000,
    })

    expect(entry).toMatchObject({
      level: "warn",
      args: ["hello"],
      ts: 1000,
    })
  })

  it("parses runtime error messages", () => {
    const entry = parsePreviewErrorMessage({
      type: "pngto-preview-error",
      kind: "error",
      message: "Boom",
      source: "inline",
      lineno: 4,
      colno: 9,
      stack: "Error: Boom",
      ts: 2000,
    })

    expect(entry).toMatchObject({
      kind: "error",
      message: "Boom",
      source: "inline",
      lineno: 4,
      colno: 9,
      stack: "Error: Boom",
      ts: 2000,
    })
  })

  it("parses network messages", () => {
    const entry = parsePreviewNetworkMessage({
      type: "pngto-preview-network",
      kind: "fetch",
      method: "GET",
      url: "/api/data",
      status: 404,
      durationMs: 42,
      ts: 3000,
    })

    expect(entry).toMatchObject({
      kind: "fetch",
      method: "GET",
      url: "/api/data",
      status: 404,
      durationMs: 42,
      ts: 3000,
    })
  })

  it("parses performance messages", () => {
    const entry = parsePreviewPerformanceMessage({
      type: "pngto-preview-performance",
      entryType: "measure",
      name: "render",
      duration: 12.5,
      startTime: 1,
      ts: 4000,
    })

    expect(entry).toMatchObject({
      entryType: "measure",
      name: "render",
      duration: 12.5,
      startTime: 1,
      ts: 4000,
    })
  })

  it("recognizes known preview message types", () => {
    expect(isKnownPreviewMessageType({ type: "pngto-preview-network" })).toBe(true)
    expect(isKnownPreviewMessageType({ type: "other" })).toBe(false)
  })

  it("accepts trusted srcdoc sandbox messages with null origin", () => {
    const event = {
      origin: "null",
      data: {
        type: "pngto-preview-console",
        level: "log",
        args: ["ok"],
        ts: 1,
      },
    } as MessageEvent

    expect(isTrustedPreviewMessage(event)).toBe(true)
    expect(normalizePreviewErrorMessage(event.data)).toBeNull()
    expect(normalizePreviewNetworkMessage(event.data)).toBeNull()
    expect(normalizePreviewPerformanceMessage(event.data)).toBeNull()
  })

  it("rejects unknown origins for preview messages", () => {
    const event = {
      origin: "https://evil.example",
      data: {
        type: "pngto-preview-error",
        kind: "error",
        message: "nope",
        ts: 1,
      },
    } as MessageEvent

    expect(isTrustedPreviewMessage(event)).toBe(false)
  })
})
