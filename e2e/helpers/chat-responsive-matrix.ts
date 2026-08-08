import type { Page } from "@playwright/test"

import { CHAT_SESSIONS_STORAGE_KEY } from "@/lib/chat/chat-sessions"
import { RESPONSIVE_MATRIX } from "@/lib/test/viewport-presets"

export { RESPONSIVE_MATRIX }

export type RectMetrics = {
  top: number
  bottom: number
  left: number
  right: number
  width: number
  height: number
}

function buildSeededSession(messageCount = 20) {
  const now = new Date().toISOString()
  const sessionId = "e2e-responsive-session"
  const messages = Array.from({ length: messageCount }, (_, index) => {
    const isUser = index % 2 === 0
    return {
      id: `msg-${index + 1}`,
      role: isUser ? ("user" as const) : ("assistant" as const),
      content: isUser
        ? `User message ${index + 1}: responsive layout probe with enough text to wrap on narrow screens.`
        : `Assistant reply ${index + 1}: markdown **bold**, list\n- one\n- two\n\nand a longer paragraph to exercise scroll height.`,
      createdAt: now,
    }
  })

  return {
    activeSessionId: sessionId,
    sessions: [
      {
        id: sessionId,
        title: "Responsive audit",
        messages,
        projectName: "Jarvis",
        updatedAt: now,
      },
    ],
  }
}

/** Seed localStorage before first navigation so ChatShell hydrates with messages. */
export async function seedChatWithMessages(page: Page, messageCount = 20): Promise<void> {
  const payload = buildSeededSession(messageCount)
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value)
    },
    { key: CHAT_SESSIONS_STORAGE_KEY, value: JSON.stringify(payload) },
  )
}

export async function gotoSeededChat(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height })
  await page.goto("/chat", { waitUntil: "domcontentloaded" })
  await page.waitForSelector('[data-testid="workspace-footer"]', { timeout: 30_000 })
  await page.waitForSelector('[aria-label="Chat messages"]', { timeout: 30_000 })
}

export async function collectMatrixMetrics(page: Page) {
  return page.evaluate(() => {
    const roundRect = (el: Element | null) => {
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }
    }

    const workspace = document.querySelector(".jarvis-workspace")
    const header = document.querySelector('[data-testid="workspace-header"]')
    const footer = document.querySelector('[data-testid="workspace-footer"]')
    const composer =
      document.querySelector(".jarvis-composer-shell") ??
      document.querySelector('[aria-label="Message input"]')
    const log = document.querySelector('[aria-label="Chat messages"]')
    const messages = log ? Array.from(log.querySelectorAll('[data-testid="message-bubble"], [role="article"]')) : []
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null

    if (log instanceof HTMLElement) {
      log.scrollTop = log.scrollHeight
    }

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      workspaceScrollWidth: workspace?.scrollWidth ?? 0,
      workspaceClientWidth: workspace?.clientWidth ?? 0,
      header: roundRect(header),
      footer: roundRect(footer),
      composer: roundRect(composer),
      lastMessage: roundRect(lastMessage),
      composerScrollWidth: composer?.scrollWidth ?? 0,
      composerClientWidth: composer?.clientWidth ?? 0,
    }
  })
}
