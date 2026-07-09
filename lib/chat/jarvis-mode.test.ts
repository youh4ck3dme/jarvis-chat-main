import { afterEach, describe, expect, it } from "vitest"

import {
  JARVIS_BUILDER_UNLOCKED_KEY,
  JARVIS_MODE_STORAGE_KEY,
  isValidJarvisMode,
  persistBuilderUnlocked,
  persistJarvisMode,
  readBuilderUnlocked,
  readStoredJarvisMode,
} from "./jarvis-mode"

describe("jarvis-mode", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("defaults to chat mode when nothing is stored", () => {
    expect(readStoredJarvisMode()).toBe("chat")
    expect(readBuilderUnlocked()).toBe(false)
  })

  it("persists and reads chat/builder mode", () => {
    persistJarvisMode("builder")
    expect(readStoredJarvisMode()).toBe("builder")
    expect(localStorage.getItem(JARVIS_MODE_STORAGE_KEY)).toBe("builder")
  })

  it("persists builder unlock state", () => {
    persistBuilderUnlocked(true)
    expect(readBuilderUnlocked()).toBe(true)
    expect(localStorage.getItem(JARVIS_BUILDER_UNLOCKED_KEY)).toBe("true")
  })

  it("guards invalid stored mode values", () => {
    localStorage.setItem(JARVIS_MODE_STORAGE_KEY, "invalid")
    expect(readStoredJarvisMode()).toBe("chat")
    expect(isValidJarvisMode("chat")).toBe(true)
    expect(isValidJarvisMode("builder")).toBe(true)
    expect(isValidJarvisMode("other")).toBe(false)
  })
})