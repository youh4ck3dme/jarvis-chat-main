import type { Message } from "@/components/chat/chat-shell"

export const PROJECT_NAME_STORAGE = "jarvis-project-name"

export const QUICK_PROMPTS = {
  completePage: "Dokonči HTML dokument. Pridaj chýbajúce </html>, <script> a všetky sekcie.",
  addScript: "Doplň funkčný inline <script> pre všetky buttony na stránke.",
  simplify: "Zjednoduš layout — menej sekcií, zachovaj hlavný CTA a responzívny dizajn.",
  addContact: 'Pridaj sekciu Contact s formulárom a anchor id="contact".',
  addPricing: 'Pridaj sekciu Pricing s 3 plánmi a anchor id="pricing".',
  addFaq: 'Pridaj sekciu FAQ s accordionom a anchor id="faq".',
  addFooter: "Pridaj footer s odkazmi, sociálnymi ikonami a copyright.",
} as const

export type QuickPromptKey = keyof typeof QUICK_PROMPTS

export function readProjectName(): string {
  if (typeof window === "undefined") return "Jarvis"
  return localStorage.getItem(PROJECT_NAME_STORAGE)?.trim() || "Jarvis"
}

export function saveProjectName(name: string): void {
  const trimmed = name.trim() || "Jarvis"
  localStorage.setItem(PROJECT_NAME_STORAGE, trimmed)
}

export function exportChatAsJson(messages: Message[], projectName: string): void {
  const payload = {
    projectName,
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages: messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    })),
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `jarvis-chat-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}