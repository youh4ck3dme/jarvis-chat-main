import type { Message } from "@/components/chat/chat-shell"

export const CHAT_SESSIONS_STORAGE_KEY = "jarvis-chat-sessions"
export const LEGACY_CHAT_MESSAGES_KEY = "chat-messages"
export const PROJECT_NAME_STORAGE = "jarvis-project-name"

export const DEFAULT_SESSION_TITLE = "Nová konverzácia"
const MAX_SESSION_TITLE_LEN = 48

export type StoredChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
  imageData?: string
  attachment?: string
  attachmentName?: string
  narrative?: boolean
}

export type ChatSession = {
  id: string
  title: string
  messages: StoredChatMessage[]
  projectName: string
  updatedAt: string
}

export type ChatSessionsState = {
  activeSessionId: string
  sessions: ChatSession[]
}

export function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function readStoredProjectName(): string {
  if (typeof window === "undefined") return "Jarvis"
  return window.localStorage.getItem(PROJECT_NAME_STORAGE)?.trim() || "Jarvis"
}

export function truncateSessionTitle(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ")
  if (!normalized) return DEFAULT_SESSION_TITLE
  if (normalized.length <= MAX_SESSION_TITLE_LEN) return normalized
  return `${normalized.slice(0, MAX_SESSION_TITLE_LEN)}…`
}

export function deriveSessionTitle(messages: StoredChatMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user" && message.content.trim())
  if (!firstUser) return DEFAULT_SESSION_TITLE
  return truncateSessionTitle(firstUser.content)
}

export function serializeMessages(messages: Message[]): StoredChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    imageData: message.imageData,
    attachment: message.attachment,
    attachmentName: message.attachmentName,
    narrative: message.narrative,
  }))
}

export function deserializeMessages(stored: StoredChatMessage[]): Message[] {
  return stored.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: new Date(message.createdAt),
    imageData: message.imageData,
    attachment: message.attachment,
    attachmentName: message.attachmentName,
    narrative: message.narrative,
  }))
}

export function createEmptySession(projectName = readStoredProjectName()): ChatSession {
  const now = new Date().toISOString()
  return {
    id: generateSessionId(),
    title: DEFAULT_SESSION_TITLE,
    messages: [],
    projectName,
    updatedAt: now,
  }
}

function parseLegacyMessages(raw: string): StoredChatMessage[] | null {
  try {
    const parsed = JSON.parse(raw) as Array<{
      id: string
      role: "user" | "assistant"
      content: string
      createdAt: string
      imageData?: string
      attachment?: string
      attachmentName?: string
      narrative?: boolean
    }>

    if (!Array.isArray(parsed)) return null

    return parsed.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt:
        typeof message.createdAt === "string"
          ? message.createdAt
          : new Date(message.createdAt).toISOString(),
      imageData: message.imageData,
      attachment: message.attachment,
      attachmentName: message.attachmentName,
      narrative: message.narrative,
    }))
  } catch {
    return null
  }
}

function migrateLegacyChatMessages(): ChatSessionsState | null {
  if (typeof window === "undefined") return null

  const legacy = window.localStorage.getItem(LEGACY_CHAT_MESSAGES_KEY)
  if (!legacy) return null

  const messages = parseLegacyMessages(legacy)
  window.localStorage.removeItem(LEGACY_CHAT_MESSAGES_KEY)

  if (!messages || messages.length === 0) {
    return null
  }

  const session: ChatSession = {
    id: generateSessionId(),
    title: deriveSessionTitle(messages),
    messages,
    projectName: readStoredProjectName(),
    updatedAt: new Date().toISOString(),
  }

  return {
    activeSessionId: session.id,
    sessions: [session],
  }
}

function parseSessionsState(raw: string): ChatSessionsState | null {
  try {
    const parsed = JSON.parse(raw) as ChatSessionsState
    if (!parsed || !Array.isArray(parsed.sessions) || !parsed.activeSessionId) {
      return null
    }

    const sessions = parsed.sessions
      .filter((session) => session && typeof session.id === "string")
      .map((session) => ({
        id: session.id,
        title: session.title?.trim() || DEFAULT_SESSION_TITLE,
        messages: Array.isArray(session.messages) ? session.messages : [],
        projectName: session.projectName?.trim() || readStoredProjectName(),
        updatedAt: session.updatedAt || new Date().toISOString(),
      }))

    if (sessions.length === 0) return null

    const activeSessionId = sessions.some((session) => session.id === parsed.activeSessionId)
      ? parsed.activeSessionId
      : sessions[0].id

    return { activeSessionId, sessions }
  } catch {
    return null
  }
}

export function loadChatSessionsState(): ChatSessionsState {
  if (typeof window === "undefined") {
    const session = createEmptySession("Jarvis")
    return { activeSessionId: session.id, sessions: [session] }
  }

  const stored = window.localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY)
  if (stored) {
    const parsed = parseSessionsState(stored)
    if (parsed) return parsed
  }

  const migrated = migrateLegacyChatMessages()
  if (migrated) {
    persistChatSessionsState(migrated)
    return migrated
  }

  const session = createEmptySession()
  const state = { activeSessionId: session.id, sessions: [session] }
  persistChatSessionsState(state)
  return state
}

export function persistChatSessionsState(state: ChatSessionsState): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(state))
}

export function getActiveSession(state: ChatSessionsState): ChatSession {
  return (
    state.sessions.find((session) => session.id === state.activeSessionId) ?? state.sessions[0]
  )
}

export function listSessionsSorted(state: ChatSessionsState): ChatSession[] {
  return [...state.sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function updateActiveSession(
  state: ChatSessionsState,
  patch: {
    messages?: Message[]
    projectName?: string
    title?: string
  },
): ChatSessionsState {
  const now = new Date().toISOString()
  const sessions = state.sessions.map((session) => {
    if (session.id !== state.activeSessionId) return session

    const messages = patch.messages ? serializeMessages(patch.messages) : session.messages
    const projectName = patch.projectName?.trim() || session.projectName
    const title =
      patch.title?.trim() ||
      (patch.messages ? deriveSessionTitle(messages) : session.title) ||
      DEFAULT_SESSION_TITLE

    return {
      ...session,
      messages,
      projectName,
      title,
      updatedAt: now,
    }
  })

  return { ...state, sessions }
}

export function addNewSession(
  state: ChatSessionsState,
  projectName = readStoredProjectName(),
): ChatSessionsState {
  const session = createEmptySession(projectName)
  return {
    activeSessionId: session.id,
    sessions: [session, ...state.sessions],
  }
}

export function switchActiveSession(
  state: ChatSessionsState,
  sessionId: string,
): ChatSessionsState | null {
  if (!state.sessions.some((session) => session.id === sessionId)) {
    return null
  }

  return { ...state, activeSessionId: sessionId }
}

export function deleteSession(
  state: ChatSessionsState,
  sessionId: string,
): { state: ChatSessionsState; deleted: boolean } {
  if (state.sessions.length <= 1) {
    const replacement = createEmptySession(getActiveSession(state).projectName)
    return {
      state: { activeSessionId: replacement.id, sessions: [replacement] },
      deleted: true,
    }
  }

  const sessions = state.sessions.filter((session) => session.id !== sessionId)
  const activeSessionId =
    state.activeSessionId === sessionId ? sessions[0].id : state.activeSessionId

  return {
    state: { activeSessionId, sessions },
    deleted: true,
  }
}