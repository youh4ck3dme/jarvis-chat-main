import { afterEach, describe, expect, it } from "vitest"

import {
  CHAT_SESSIONS_STORAGE_KEY,
  DEFAULT_SESSION_TITLE,
  LEGACY_CHAT_MESSAGES_KEY,
  addNewSession,
  deleteSession,
  deriveSessionTitle,
  deserializeMessages,
  loadChatSessionsState,
  persistChatSessionsState,
  serializeMessages,
  switchActiveSession,
  truncateSessionTitle,
  updateActiveSession,
} from "./chat-sessions"

describe("chat-sessions", () => {
  afterEach(() => {
    localStorage.clear()
  })

  it("creates a default empty session when storage is empty", () => {
    const state = loadChatSessionsState()

    expect(state.sessions).toHaveLength(1)
    expect(state.activeSessionId).toBe(state.sessions[0].id)
    expect(state.sessions[0].messages).toEqual([])
    expect(state.sessions[0].title).toBe(DEFAULT_SESSION_TITLE)
    expect(localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY)).toBeTruthy()
  })

  it("migrates legacy chat-messages into a single session", () => {
    localStorage.setItem(
      LEGACY_CHAT_MESSAGES_KEY,
      JSON.stringify([
        {
          id: "u1",
          role: "user",
          content: "Urob landing page pre kaviareň",
          createdAt: "2026-01-01T10:00:00.000Z",
        },
        {
          id: "a1",
          role: "assistant",
          content: "Jasné, začínam.",
          createdAt: "2026-01-01T10:00:05.000Z",
        },
      ]),
    )

    const state = loadChatSessionsState()

    expect(localStorage.getItem(LEGACY_CHAT_MESSAGES_KEY)).toBeNull()
    expect(state.sessions).toHaveLength(1)
    expect(state.sessions[0].title).toBe("Urob landing page pre kaviareň")
    expect(state.sessions[0].messages).toHaveLength(2)
    expect(deserializeMessages(state.sessions[0].messages)[0].content).toContain("landing page")
  })

  it("adds a new session and keeps the previous one", () => {
    const initial = loadChatSessionsState()
    const withMessage = updateActiveSession(initial, {
      messages: [
        {
          id: "m1",
          role: "user",
          content: "Prvá konverzácia",
          createdAt: new Date(),
        },
      ],
    })
    persistChatSessionsState(withMessage)

    const next = addNewSession(withMessage, "Jarvis")
    persistChatSessionsState(next)

    expect(next.sessions).toHaveLength(2)
    expect(next.activeSessionId).not.toBe(withMessage.activeSessionId)
    expect(next.sessions.find((session) => session.id === withMessage.activeSessionId)?.messages).toHaveLength(1)
    expect(getActiveMessages(next)).toHaveLength(0)
  })

  it("switches active session and updates messages in state", () => {
    const first = loadChatSessionsState()
    const secondState = addNewSession(first, "Jarvis")
    const firstSessionId = secondState.sessions[1].id

    const switched = switchActiveSession(secondState, firstSessionId)
    expect(switched?.activeSessionId).toBe(firstSessionId)
  })

  it("deletes a session and falls back to another active session", () => {
    const first = loadChatSessionsState()
    const secondState = addNewSession(first, "Jarvis")
    const deletedId = secondState.activeSessionId

    const { state, deleted } = deleteSession(secondState, deletedId)

    expect(deleted).toBe(true)
    expect(state.sessions.some((session) => session.id === deletedId)).toBe(false)
    expect(state.sessions).toHaveLength(1)
  })

  it("replaces the last session with a fresh empty one on delete", () => {
    const only = loadChatSessionsState()
    const { state, deleted } = deleteSession(only, only.activeSessionId)

    expect(deleted).toBe(true)
    expect(state.sessions).toHaveLength(1)
    expect(state.sessions[0].messages).toEqual([])
    expect(state.activeSessionId).toBe(state.sessions[0].id)
  })

  it("serializes and derives titles from user messages", () => {
    const title = deriveSessionTitle([
      {
        id: "m1",
        role: "user",
        content: "  Nakóduj   mi   SaaS landing   ",
        createdAt: new Date().toISOString(),
      },
    ])

    expect(title).toBe("Nakóduj mi SaaS landing")
    expect(truncateSessionTitle("x".repeat(60)).endsWith("…")).toBe(true)

    const serialized = serializeMessages([
      {
        id: "m1",
        role: "user",
        content: "Ahoj",
        createdAt: new Date("2026-03-01T12:00:00.000Z"),
      },
    ])

    expect(serialized[0].createdAt).toBe("2026-03-01T12:00:00.000Z")
  })

  it("migrates latest HTML into artifacts[0] for legacy sessions", () => {
    localStorage.setItem(
      CHAT_SESSIONS_STORAGE_KEY,
      JSON.stringify({
        activeSessionId: "legacy-1",
        sessions: [
          {
            id: "legacy-1",
            title: "Legacy",
            projectName: "Jarvis",
            updatedAt: "2026-07-13T10:00:00.000Z",
            messages: [
              {
                id: "a1",
                role: "assistant",
                content: "```html\n<!doctype html><html><body><h1>Legacy</h1></body></html>\n```",
                createdAt: "2026-07-13T10:00:00.000Z",
              },
            ],
          },
        ],
      }),
    )

    const state = loadChatSessionsState()
    expect(state.sessions[0]?.artifacts).toHaveLength(1)
    expect(state.sessions[0]?.artifacts[0]?.html).toContain("Legacy")
    expect(state.sessions[0]?.activeArtifactId).toBe(state.sessions[0]?.artifacts[0]?.id)
  })

  it("persists multi-artifact workspace on the active session", () => {
    const initial = loadChatSessionsState()
    const next = updateActiveSession(initial, {
      artifacts: [
        {
          id: "art-index",
          slug: "index",
          title: "Home",
          html: "<html>home</html>",
          createdAt: "2026-07-13T12:00:00.000Z",
        },
        {
          id: "art-about",
          slug: "about",
          title: "About",
          html: "<html>about</html>",
          createdAt: "2026-07-13T12:00:00.000Z",
        },
      ],
      activeArtifactId: "art-about",
    })

    persistChatSessionsState(next)
    const reloaded = loadChatSessionsState()
    expect(reloaded.sessions[0]?.artifacts).toHaveLength(2)
    expect(reloaded.sessions[0]?.activeArtifactId).toBe("art-about")
  })
})

function getActiveMessages(state: ReturnType<typeof loadChatSessionsState>) {
  const active = state.sessions.find((session) => session.id === state.activeSessionId)
  return active?.messages ?? []
}