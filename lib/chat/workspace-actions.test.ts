import { afterEach, describe, expect, it, vi } from "vitest"

import type { Message } from "@/components/chat/chat-shell"

import {
  PROJECT_NAME_STORAGE,
  QUICK_PROMPTS,
  exportChatAsJson,
  readProjectName,
  saveProjectName,
} from "./workspace-actions"

describe("workspace-actions", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("reads and saves project name", () => {
    expect(readProjectName()).toBe("Jarvis")
    saveProjectName("Coffee Shop")
    expect(readProjectName()).toBe("Coffee Shop")
    expect(localStorage.getItem(PROJECT_NAME_STORAGE)).toBe("Coffee Shop")
  })

  it("exports chat messages as downloadable json", () => {
    const anchorClick = vi.fn()
    const createObjectURL = vi.fn(() => "blob:test")
    const revokeObjectURL = vi.fn()

    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL,
        revokeObjectURL,
      }),
    )

    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === "a") {
        element.click = anchorClick
      }
      return element
    })

    const messages: Message[] = [
      {
        id: "1",
        role: "user",
        content: "Build a page",
        createdAt: new Date("2026-07-09T12:00:00Z"),
      },
    ]

    exportChatAsJson(messages, "Jarvis")

    expect(createObjectURL).toHaveBeenCalled()
    expect(anchorClick).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test")

    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("defines quick prompts for composer actions", () => {
    expect(QUICK_PROMPTS.completePage).toContain("Dokonči HTML")
    expect(QUICK_PROMPTS.addScript).toContain("<script>")
    expect(QUICK_PROMPTS.addContact).toContain("contact")
  })
})