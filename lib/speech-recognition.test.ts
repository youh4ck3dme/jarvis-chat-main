import { describe, expect, it } from "vitest"

import {
  getSpeechRecognitionErrorMessage,
  isIgnorableSpeechError,
} from "./speech-recognition"

describe("speech-recognition", () => {
  it("describes network error with desktop fallback hint when agent online", () => {
    const msg = getSpeechRecognitionErrorMessage("network", { desktopAgentOnline: true })
    expect(msg).toContain("Desktop JARVIS")
  })

  it("describes network error with make run hint when agent offline", () => {
    const msg = getSpeechRecognitionErrorMessage("network", { desktopAgentOnline: false })
    expect(msg).toContain("Desktop JARVIS")
    expect(msg).toContain("make run")
  })

  it("describes microphone permission errors", () => {
    expect(getSpeechRecognitionErrorMessage("not-allowed")).toContain("Mikrofón")
    expect(getSpeechRecognitionErrorMessage("service-not-allowed")).toContain("Mikrofón")
  })

  it("describes audio capture failures", () => {
    expect(getSpeechRecognitionErrorMessage("audio-capture")).toContain("Mikrofón")
  })

  it("ignores aborted recognition stops", () => {
    expect(isIgnorableSpeechError("aborted")).toBe(true)
    expect(isIgnorableSpeechError("network")).toBe(false)
  })
})