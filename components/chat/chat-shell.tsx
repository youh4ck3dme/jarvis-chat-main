"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { MessageSquareDashed, Settings, X, Eye, EyeOff } from "lucide-react"
import dynamic from "next/dynamic"

import { JarvisPreviewPanel } from "@/copied-from-visual-html/components/jarvis/jarvis-preview-panel"
import { useThrottledValue } from "@/copied-from-visual-html/hooks/use-throttled-value"
import { JARVIS_ADVISOR_SYSTEM_PROMPT } from "@/copied-from-visual-html/lib/jarvis-advisor-prompt"
import {
  extractJarvisHtmlArtifact,
  prepareJarvisPreviewHtml,
} from "@/copied-from-visual-html/lib/jarvis-artifacts"
import { readExperienceHint, recordBuildEvaluation } from "@/lib/agents/build-experience"
import type { BuildEvaluation, BuildTrace } from "@/types/build"
import {
  buildIncompleteHtmlError,
  runBuildPipeline,
  type PipelineChatMessage,
} from "@/lib/chat/build-pipeline"
import { BuildTelemetry } from "@/components/workspace/build-telemetry"
import { WorkspaceFooter, type WorkspaceView } from "@/components/workspace/workspace-footer"
import { WorkspaceHeader } from "@/components/workspace/workspace-header"
import { WorkspaceMenuDrawer } from "@/components/workspace/workspace-menu-drawer"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import {
  type JarvisMode,
  JARVIS_CHAT_SYSTEM_PROMPT,
  persistBuilderUnlocked,
  persistJarvisMode,
  readBuilderUnlocked,
  readStoredJarvisMode,
} from "@/lib/chat/jarvis-mode"
import {
  createNarrativeBeat,
  detectBuildIntent,
  JARVIS_BUILDER_LOCKED_HINT,
  JARVIS_STORY_BUILD_INTENT,
  JARVIS_STORY_BUILD_SUCCESS,
  JARVIS_STORY_NUDGE,
  JARVIS_STORY_NUDGE_DELAY_MS,
  JARVIS_STORY_PLAN_READY,
  markStoryNudgeShown,
  readStoryNudgeShown,
} from "@/lib/chat/jarvis-story"
import type { BuildPlan } from "@/types/build"
import { OrbMindMap } from "@/components/workspace/orb-mind-map"
import { readApiErrorMessage } from "@/lib/api-response"
import {
  listBuildHistory,
  saveBuildHistory,
  type BuildHistoryRecord,
} from "@/lib/build-history/build-history-store"
import {
  addNewSession,
  deleteSession,
  deserializeMessages,
  getActiveSession,
  loadChatSessionsState,
  persistChatSessionsState,
  switchActiveSession,
  updateActiveSession,
  type ChatSession,
} from "@/lib/chat/chat-sessions"
import { exportFullJarvisBackup, importFullJarvisBackup } from "@/lib/chat/jarvis-backup-client"
import {
  fetchSessionSyncStatus,
  mergeLocalWithRemote,
  pullSessionsFromCloud,
  pushSessionsToCloud,
} from "@/lib/chat/session-sync"
import {
  exportChatAsJson,
  readProjectName,
  saveProjectName,
} from "@/lib/chat/workspace-actions"
import { extractFromMessage, updateConversationSummary, clearConversationMemory, buildAICcontext } from "@/lib/memory"
import { DEFAULT_AI_MODEL, getDefaultAiModel } from "@/lib/default-model"
import { isProviderAuthError } from "@/lib/resolve-api-key"

export type ArtifactTab = "preview" | "code"

import { MessageList } from "./message-list"
import { AI_MODELS, isModelAvailable, type AIModel } from "./composer"

// Dynamic import to avoid SSR issues with IndexedDB
const MemoryPanel = dynamic(
  () => import('./memory-panel'),
  { ssr: false }
)

// Data model for messages
export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
  imageData?: string
  attachment?: string
  attachmentName?: string
  /** Scripted story beat — rendered as a quoted narrative line. */
  narrative?: boolean
}

// localStorage keys
const MODEL_STORAGE_KEY = "chat-selected-model"
const MISTRAL_KEY_STORAGE = "settings-mistral-key"
const GOOGLE_KEY_STORAGE = "settings-google-key"
const OPENAI_KEY_STORAGE = "settings-openai-key"
const ANTHROPIC_KEY_STORAGE = "settings-anthropic-key"

// Generates a unique ID for messages
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function toPipelineMessage(message: Pick<Message, "role" | "content" | "imageData">): PipelineChatMessage {
  return {
    role: message.role,
    content: message.content,
    imageData: message.imageData,
  }
}

function buildApiKeyHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const mistral = localStorage.getItem(MISTRAL_KEY_STORAGE)?.trim()
  const google = localStorage.getItem(GOOGLE_KEY_STORAGE)?.trim()
  const openai = localStorage.getItem(OPENAI_KEY_STORAGE)?.trim()
  const anthropic = localStorage.getItem(ANTHROPIC_KEY_STORAGE)?.trim()

  if (mistral) headers["x-mistral-key"] = mistral
  if (google) headers["x-google-key"] = google
  if (openai) headers["x-openai-key"] = openai
  if (anthropic) headers["x-anthropic-key"] = anthropic

  return headers
}

async function readApiError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    try {
      const data = await response.json()
      const message = readApiErrorMessage(data)
      if (message) {
        return message
      }
    } catch {
      // fall through to generic message
    }
  }

  return `Request failed (${response.status})`
}

export function ChatShell() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [selectedModel, setSelectedModel] = useState<AIModel>(
    () => getDefaultAiModel() as AIModel,
  )
  const [isLoaded, setIsLoaded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("chat")
  const [artifactTab, setArtifactTab] = useState<ArtifactTab>("preview")
  const [isMobile, setIsMobile] = useState(false)
  const [buildEvaluation, setBuildEvaluation] = useState<BuildEvaluation | null>(null)
  const [buildTrace, setBuildTrace] = useState<BuildTrace | null>(null)
  const [buildHistoryCount, setBuildHistoryCount] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMemoryOpen, setIsMemoryOpen] = useState(false)
  const [sessionSyncEnabled, setSessionSyncEnabled] = useState(false)
  const deletedSessionIdsRef = useRef<string[]>([])
  const syncPushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [projectName, setProjectName] = useState("Jarvis")
  const [jarvisMode, setJarvisMode] = useState<JarvisMode>("chat")
  const [builderUnlocked, setBuilderUnlocked] = useState(false)
  const [pipelinePhase, setPipelinePhase] = useState<"planner" | null>(null)
  const [plannerPlan, setPlannerPlan] = useState<BuildPlan | null>(null)
  const [builderUnlockDialogOpen, setBuilderUnlockDialogOpen] = useState(false)
  const pendingBuildPromptRef = useRef<string | null>(null)
  const resumeAfterUnlockRef = useRef(false)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [memoryConversationId, setMemoryConversationId] = useState<string | null>(null)
  const [memorySessionTitle, setMemorySessionTitle] = useState<string | null>(null)

  // Settings states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [keys, setKeys] = useState({
    mistral: "",
    google: "",
    openai: "",
    anthropic: "",
  })
  const [showKeys, setShowKeys] = useState({
    mistral: false,
    google: false,
    openai: false,
    anthropic: false,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !isLoaded || jarvisMode !== "chat" || isStreaming) return
    if (readStoryNudgeShown()) return

    const timer = window.setTimeout(() => {
      if (readStoryNudgeShown()) return
      markStoryNudgeShown()

      const nudgeMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: JARVIS_STORY_NUDGE,
        createdAt: new Date(),
        narrative: true,
      }

      setMessages((prev) => {
        if (prev.some((message) => message.content === JARVIS_STORY_NUDGE)) return prev
        return [...prev, nudgeMessage]
      })
    }, JARVIS_STORY_NUDGE_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [mounted, isLoaded, jarvisMode, isStreaming])

  useEffect(() => {
    if (!mounted) return
    listBuildHistory(50).then((records) => setBuildHistoryCount(records.length))
  }, [mounted])

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const rawHtmlArtifact = useMemo(
    () => extractJarvisHtmlArtifact(messages),
    [messages],
  )

  const livePreviewHtml = useMemo(
    () =>
      rawHtmlArtifact
        ? prepareJarvisPreviewHtml(rawHtmlArtifact, { streaming: isStreaming })
        : null,
    [rawHtmlArtifact, isStreaming],
  )

  const previewHtmlContent = useThrottledValue(livePreviewHtml, isStreaming ? 200 : 0)
  const hasArtifact = Boolean(rawHtmlArtifact)

  const isBuildActive =
    jarvisMode === "builder" &&
    (isStreaming || pipelinePhase === "planner" || Boolean(plannerPlan) || hasArtifact)

  useEffect(() => {
    if (!isMobile || !isBuildActive) return
    setWorkspaceView("artifact")
    setArtifactTab("preview")
  }, [hasArtifact, isBuildActive, isMobile])

  const conversationId = activeSessionId ?? "default-conversation"

  // Load state and keys from localStorage on mount
  useEffect(() => {
    try {
      const sessionsState = loadChatSessionsState()
      const activeSession = getActiveSession(sessionsState)
      setActiveSessionId(activeSession.id)
      setChatSessions(sessionsState.sessions)
      setMessages(deserializeMessages(activeSession.messages))
      setProjectName(activeSession.projectName || readProjectName())
      const loadedKeys = {
        mistral: localStorage.getItem(MISTRAL_KEY_STORAGE) || "",
        google: localStorage.getItem(GOOGLE_KEY_STORAGE) || "",
        openai: localStorage.getItem(OPENAI_KEY_STORAGE) || "",
        anthropic: localStorage.getItem(ANTHROPIC_KEY_STORAGE) || "",
      }
      setKeys(loadedKeys)

      setProjectName(readProjectName())

      const unlocked = readBuilderUnlocked()
      const storedMode = readStoredJarvisMode()
      setBuilderUnlocked(unlocked)
      setJarvisMode(storedMode === "builder" && unlocked ? "builder" : "chat")

      const savedModel = localStorage.getItem(MODEL_STORAGE_KEY) as AIModel | null
      const savedEntry = AI_MODELS.find((m) => m.id === savedModel)
      if (savedModel && savedEntry && isModelAvailable(savedEntry, loadedKeys)) {
        setSelectedModel(savedModel)
      } else if (savedModel) {
        setSelectedModel(DEFAULT_AI_MODEL)
        localStorage.setItem(MODEL_STORAGE_KEY, DEFAULT_AI_MODEL)
      }
    } catch (e) {
      console.error("Failed to load settings:", e)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Persist active session whenever messages or project name change
  useEffect(() => {
    if (!isLoaded || !activeSessionId) return

    try {
      const nextState = updateActiveSession(loadChatSessionsState(), {
        messages,
        projectName,
      })
      persistChatSessionsState(nextState)
      setChatSessions(nextState.sessions)
    } catch (e) {
      console.error("Failed to save chat session:", e)
    }
  }, [messages, projectName, isLoaded, activeSessionId])

  useEffect(() => {
    if (!isLoaded) return

    void (async () => {
      const status = await fetchSessionSyncStatus()
      setSessionSyncEnabled(status.enabled)
      if (!status.enabled) return

      try {
        const remote = await pullSessionsFromCloud()
        const local = loadChatSessionsState()
        const merged = mergeLocalWithRemote(local, remote)

        if (JSON.stringify(merged) !== JSON.stringify(local)) {
          persistChatSessionsState(merged)
          const activeSession = getActiveSession(merged)
          setActiveSessionId(activeSession.id)
          setChatSessions(merged.sessions)
          setMessages(deserializeMessages(activeSession.messages))
          setProjectName(activeSession.projectName)
          saveProjectName(activeSession.projectName)
        }
      } catch (syncError) {
        console.warn("Session sync pull failed:", syncError)
      }
    })()
  }, [isLoaded])

  useEffect(() => {
    if (!isLoaded || !sessionSyncEnabled || !activeSessionId) return

    if (syncPushTimerRef.current) {
      clearTimeout(syncPushTimerRef.current)
    }

    syncPushTimerRef.current = setTimeout(() => {
      const state = loadChatSessionsState()
      void pushSessionsToCloud(state, deletedSessionIdsRef.current)
        .then(() => {
          deletedSessionIdsRef.current = []
        })
        .catch((syncError: unknown) => {
          console.warn("Session sync push failed:", syncError)
        })
    }, 2000)

    return () => {
      if (syncPushTimerRef.current) {
        clearTimeout(syncPushTimerRef.current)
      }
    }
  }, [messages, projectName, chatSessions, isLoaded, sessionSyncEnabled, activeSessionId])

  const handleModelChange = useCallback((model: AIModel) => {
    setSelectedModel(model)
    localStorage.setItem(MODEL_STORAGE_KEY, model)
  }, [])

  const handleProjectNameChange = useCallback((name: string) => {
    setProjectName(name)
    saveProjectName(name)
  }, [])

  const handleJarvisModeChange = useCallback((mode: JarvisMode) => {
    setJarvisMode(mode)
    persistJarvisMode(mode)
  }, [])

  const sendMessageRef = useRef<
    (content: string, attachment?: string, attachmentName?: string) => Promise<void>
  >(async () => {})

  const handleBuilderUnlock = useCallback(() => {
    setBuilderUnlocked(true)
    persistBuilderUnlocked(true)
    setBuilderUnlockDialogOpen(false)
    const pending = pendingBuildPromptRef.current
    if (pending) {
      pendingBuildPromptRef.current = null
      resumeAfterUnlockRef.current = true
      setTimeout(() => {
        void sendMessageRef.current(pending)
      }, 150)
    }
  }, [])

  const handleSelectBuildRecord = useCallback((record: BuildHistoryRecord) => {
    setBuildTrace(record.trace)
    setBuildEvaluation(record.evaluation)
    setArtifactTab("preview")
    setWorkspaceView("artifact")
  }, [])

  const handleFocusTelemetry = useCallback(() => {
    setWorkspaceView("artifact")
    setArtifactTab("preview")
  }, [])

  const handleExportChat = useCallback(() => {
    exportChatAsJson(messages, projectName)
  }, [messages, projectName])

  const handleExportFullBackup = useCallback(async () => {
    const state = loadChatSessionsState()
    await exportFullJarvisBackup(state)
  }, [])

  const handleOpenMemory = useCallback(
    (sessionId?: string) => {
      const targetId = sessionId ?? activeSessionId ?? conversationId
      const session = chatSessions.find((item) => item.id === targetId)
      setMemoryConversationId(targetId)
      setMemorySessionTitle(session?.title ?? null)
      setIsMemoryOpen(true)
    },
    [activeSessionId, chatSessions, conversationId],
  )

  const handleCloseMemory = useCallback(() => {
    setIsMemoryOpen(false)
    setMemoryConversationId(null)
    setMemorySessionTitle(null)
  }, [])

  const handleClearSessionMemory = useCallback(async (sessionId: string) => {
    await clearConversationMemory(sessionId)
  }, [])

  const handleSaveSettings = useCallback(() => {
    localStorage.setItem(MISTRAL_KEY_STORAGE, keys.mistral.trim())
    localStorage.setItem(GOOGLE_KEY_STORAGE, keys.google.trim())
    localStorage.setItem(OPENAI_KEY_STORAGE, keys.openai.trim())
    localStorage.setItem(ANTHROPIC_KEY_STORAGE, keys.anthropic.trim())
    setIsSettingsOpen(false)
  }, [keys])

  // Send a message to the AI
  const sendMessage = useCallback(
    async (content: string, attachment?: string, attachmentName?: string) => {
      const imageData = attachment?.startsWith("data:image/") ? attachment : undefined
      const fileAttachment = attachment && !imageData ? attachment : undefined
      if ((!content.trim() && !attachment) || isStreaming) return

      const trimmedContent = content.trim()
      const buildIntent = detectBuildIntent(trimmedContent)

      if (jarvisMode === "chat" && buildIntent && !builderUnlocked) {
        pendingBuildPromptRef.current = trimmedContent
        const lockedUserMessage: Message = {
          id: generateId(),
          role: "user",
          content: trimmedContent || (attachment?.startsWith("data:image/") ? "Describe this image" : "Analyze this document"),
          createdAt: new Date(),
          imageData: attachment?.startsWith("data:image/") ? attachment : undefined,
        }
        const hintMessage = createNarrativeBeat(generateId(), JARVIS_BUILDER_LOCKED_HINT)
        setMessages((prev) => [...prev, lockedUserMessage, hintMessage])
        setBuilderUnlockDialogOpen(true)
        return
      }

      const runBuilderPipeline =
        jarvisMode === "builder" || (buildIntent && builderUnlocked)

      if (runBuilderPipeline && jarvisMode === "chat" && buildIntent) {
        setJarvisMode("builder")
        persistJarvisMode("builder")
      }

      setError(null)
      setBuildEvaluation(null)
      setBuildTrace(null)
      setPlannerPlan(null)

      const isResumeAfterUnlock = resumeAfterUnlockRef.current
      if (isResumeAfterUnlock) {
        resumeAfterUnlockRef.current = false
      }

      const existingLockedUserMessage =
        isResumeAfterUnlock
          ? [...messages]
              .reverse()
              .find(
                (message) =>
                  message.role === "user" &&
                  message.content.trim() === trimmedContent &&
                  !message.narrative,
              )
          : undefined

      const userMessage: Message =
        existingLockedUserMessage ??
        ({
          id: generateId(),
          role: "user",
          content: content.trim() || (imageData ? "Describe this image" : "Analyze this document"),
          createdAt: new Date(),
          imageData,
          attachment: fileAttachment,
          attachmentName: fileAttachment ? attachmentName : undefined,
        } satisfies Message)

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        createdAt: new Date(),
      }

      const storyBeats: Message[] = []
      if (runBuilderPipeline && buildIntent) {
        storyBeats.push(createNarrativeBeat(generateId(), JARVIS_STORY_BUILD_INTENT))
      }

      const baseHistory = existingLockedUserMessage
        ? messages
        : [...messages, userMessage]
      let conversationHistory: Message[] = [...baseHistory, ...storyBeats]
      let activeAssistantMessage = assistantMessage
      setMessages([...conversationHistory, activeAssistantMessage])
      setIsStreaming(true)

      const controller = new AbortController()
      setAbortController(controller)

      const streamAssistantReply = async (
        history: PipelineChatMessage[],
        assistantMsg: Message,
        systemPrompt: string,
      ): Promise<{ content: string; latencyMs: number }> => {
        const builderStart = performance.now()

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...buildApiKeyHeaders(),
          },
          body: JSON.stringify({
            messages: history,
            model: selectedModel,
            system: systemPrompt,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(await readApiError(response))
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error("No response body")
        }

        let accumulatedContent = ""

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          accumulatedContent += chunk

          if (isProviderAuthError(accumulatedContent)) {
            throw new Error(accumulatedContent.trim())
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsg.id ? { ...msg, content: accumulatedContent } : msg,
            ),
          )
        }

        return {
          content: accumulatedContent,
          latencyMs: Math.round(performance.now() - builderStart),
        }
      }

      let roundUserMessage = userMessage

      const persistRoundMemory = async (
        currentUserMessage: Message,
        assistantContent: string,
        assistantId: string,
      ) => {
        try {
          await extractFromMessage(conversationId, currentUserMessage, currentUserMessage.id)

          if (assistantContent) {
            await extractFromMessage(
              conversationId,
              {
                role: "assistant",
                content: assistantContent,
              },
              assistantId,
            )

            await updateConversationSummary(conversationId, conversationHistory)
          }
        } catch (memoryError) {
          console.warn("Failed to update memory:", memoryError)
        }
      }

      try {
        if (!runBuilderPipeline) {
          let systemPrompt = JARVIS_CHAT_SYSTEM_PROMPT
          try {
            const { systemPrompt: memorySystemPrompt } = await buildAICcontext(conversationId)
            if (memorySystemPrompt?.trim()) {
              systemPrompt = `${JARVIS_CHAT_SYSTEM_PROMPT}\n\n## User context\n${memorySystemPrompt}`
            }
          } catch (contextError) {
            console.warn("Failed to build memory context:", contextError)
          }

          const history = [...messages, userMessage].map(toPipelineMessage)
          const { content } = await streamAssistantReply(
            history,
            activeAssistantMessage,
            systemPrompt,
          )
          await persistRoundMemory(userMessage, content, activeAssistantMessage.id)
        } else {
        let systemPrompt = JARVIS_ADVISOR_SYSTEM_PROMPT
        try {
          const { systemPrompt: memorySystemPrompt } = await buildAICcontext(conversationId)
          if (memorySystemPrompt?.trim()) {
            systemPrompt = `${JARVIS_ADVISOR_SYSTEM_PROMPT}\n\n## User context\n${memorySystemPrompt}`
          }
        } catch (contextError) {
          console.warn("Failed to build memory context:", contextError)
        }

        const pipelineResult = await runBuildPipeline({
          priorHistory: messages.map(toPipelineMessage),
          userMessage: toPipelineMessage(userMessage),
          baseSystemPrompt: systemPrompt,
          experienceHint: readExperienceHint(),
          onPlannerStart: async () => {
            setPlannerPlan(null)
            setPipelinePhase("planner")
            setWorkspaceView("artifact")
            setArtifactTab("preview")
          },
          onPlannerComplete: async (planResult) => {
            if (planResult?.plan) {
              setPlannerPlan(planResult.plan)
            }
            setPipelinePhase(null)
            setWorkspaceView("artifact")
            setArtifactTab("preview")
            setMessages((prev) => [
              ...prev,
              createNarrativeBeat(generateId(), JARVIS_STORY_PLAN_READY),
            ])
          },
          fetchPlan: async (prompt, hint) => {
            const planResponse = await fetch("/api/build/plan", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...buildApiKeyHeaders(),
              },
              body: JSON.stringify({
                prompt,
                experienceHint: hint,
              }),
              signal: controller.signal,
            })

            if (!planResponse.ok) {
              return null
            }

            const payload = await planResponse.json()
            return payload?.data ?? null
          },
          streamReply: (history, enrichedPrompt) =>
            streamAssistantReply(history, activeAssistantMessage, enrichedPrompt),
          onRefinementRound: async ({ refinementPrompt }) => {
            const refineUserMessage: Message = {
              id: generateId(),
              role: "user",
              content: refinementPrompt,
              createdAt: new Date(),
            }
            const refineAssistantMessage: Message = {
              id: generateId(),
              role: "assistant",
              content: "",
              createdAt: new Date(),
            }

            conversationHistory = [...conversationHistory, refineUserMessage]
            activeAssistantMessage = refineAssistantMessage
            roundUserMessage = refineUserMessage
            setMessages([...conversationHistory, refineAssistantMessage])
          },
          onRoundComplete: async (round) => {
            const updatedAssistant = {
              ...activeAssistantMessage,
              content: round.assistantContent,
            }

            conversationHistory = conversationHistory.some(
              (message) => message.id === activeAssistantMessage.id,
            )
              ? conversationHistory.map((message) =>
                  message.id === activeAssistantMessage.id ? updatedAssistant : message,
                )
              : [...conversationHistory, updatedAssistant]

            activeAssistantMessage = updatedAssistant
            await persistRoundMemory(
              roundUserMessage,
              round.assistantContent,
              activeAssistantMessage.id,
            )
          },
        })

        const { trace, evaluation, artifact, refinementRounds } = pipelineResult

        setBuildTrace(trace)
        setBuildEvaluation(artifact ? evaluation : null)

        if (evaluation) {
          recordBuildEvaluation(evaluation)
        }

        if (evaluation && artifact) {
          const saved = await saveBuildHistory({
            userPrompt: userMessage.content,
            evaluation,
            trace,
            htmlChars: artifact.length,
            planSummary: trace.phases.find((phase) => phase.phase === "planner")?.detail,
          })
          if (saved) {
            setBuildHistoryCount((count) => Math.min(count + 1, 50))
          }
        }

        if (artifact && evaluation && !evaluation.ok) {
          setError(buildIncompleteHtmlError(evaluation, refinementRounds))
        }

        if (artifact && evaluation?.ok) {
          setMessages((prev) => [
            ...prev,
            createNarrativeBeat(generateId(), JARVIS_STORY_BUILD_SUCCESS),
          ])
        }
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === activeAssistantMessage.id
                ? { ...msg, content: msg.content || "[Cancelled]" }
                : msg,
            ),
          )
        } else {
          console.error("Error sending message:", e)
          setError(e instanceof Error ? e.message : "An error occurred")
          setMessages((prev) => prev.filter((msg) => msg.id !== activeAssistantMessage.id))
        }
      } finally {
        setIsStreaming(false)
        setAbortController(null)
      }
    },
    [messages, isStreaming, selectedModel, jarvisMode, builderUnlocked, conversationId],
  )

  sendMessageRef.current = sendMessage

  const handleQuickSend = useCallback(
    (prompt: string) => {
      void sendMessage(prompt)
    },
    [sendMessage],
  )

  const handleEditMessage = useCallback(
    (id: string, newContent: string) => {
      if (isStreaming) return

      const index = messages.findIndex((message) => message.id === id)
      if (index === -1) return

      const trimmedContent = newContent.trim()
      if (!trimmedContent) return

      setMessages(messages.slice(0, index))
      setError(null)
      setTimeout(() => sendMessage(trimmedContent), 100)
    },
    [isStreaming, messages, sendMessage],
  )

  const handleDeleteMessage = useCallback(
    (id: string) => {
      if (isStreaming) return
      setMessages((prev) => prev.filter((message) => message.id !== id))
    },
    [isStreaming],
  )

  const retry = useCallback(() => {
    if (messages.length === 0) return
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
    if (lastUserMessage) {
      const index = messages.findIndex((m) => m.id === lastUserMessage.id)
      setMessages(messages.slice(0, index))
      setError(null)
      setTimeout(() => sendMessage(lastUserMessage.content, lastUserMessage.imageData), 100)
    }
  }, [messages, sendMessage])

  const stopStreaming = useCallback(() => {
    if (abortController) {
      abortController.abort()
    }
  }, [abortController])

  const resetWorkspaceUi = useCallback(() => {
    setError(null)
    setBuildEvaluation(null)
    setBuildTrace(null)
    setPlannerPlan(null)
    setPipelinePhase(null)
    setWorkspaceView("chat")
    setIsMenuOpen(false)
    setIsMemoryOpen(false)
  }, [])

  const handleImportBackup = useCallback(
    async (file: File) => {
      const restored = await importFullJarvisBackup(file)
      const activeSession = getActiveSession(restored)
      setActiveSessionId(activeSession.id)
      setChatSessions(restored.sessions)
      setMessages(deserializeMessages(activeSession.messages))
      setProjectName(activeSession.projectName)
      saveProjectName(activeSession.projectName)
      resetWorkspaceUi()
    },
    [resetWorkspaceUi],
  )

  const clearChat = useCallback(() => {
    const currentState = loadChatSessionsState()
    const nextState = addNewSession(currentState, projectName)
    persistChatSessionsState(nextState)

    const activeSession = getActiveSession(nextState)
    setActiveSessionId(activeSession.id)
    setChatSessions(nextState.sessions)
    setMessages([])
    resetWorkspaceUi()
  }, [projectName, resetWorkspaceUi])

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (sessionId === activeSessionId || isStreaming) return

      const currentState = loadChatSessionsState()
      const nextState = switchActiveSession(currentState, sessionId)
      if (!nextState) return

      persistChatSessionsState(nextState)
      const activeSession = getActiveSession(nextState)
      setActiveSessionId(activeSession.id)
      setChatSessions(nextState.sessions)
      setMessages(deserializeMessages(activeSession.messages))
      setProjectName(activeSession.projectName)
      saveProjectName(activeSession.projectName)
      resetWorkspaceUi()
    },
    [activeSessionId, isStreaming, resetWorkspaceUi],
  )

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      if (isStreaming) return

      const currentState = loadChatSessionsState()
      const { state: nextState } = deleteSession(currentState, sessionId)
      deletedSessionIdsRef.current.push(sessionId)
      persistChatSessionsState(nextState)

      const activeSession = getActiveSession(nextState)
      setActiveSessionId(activeSession.id)
      setChatSessions(nextState.sessions)
      setMessages(deserializeMessages(activeSession.messages))
      setProjectName(activeSession.projectName)
      saveProjectName(activeSession.projectName)
      resetWorkspaceUi()

      clearConversationMemory(sessionId).catch((err: unknown) => {
        console.warn("Failed to clear session memory:", err)
      })
    },
    [isStreaming, resetWorkspaceUi],
  )

  const handlePlayPreview = useCallback(() => {
    setArtifactTab("preview")
    setWorkspaceView("artifact")
  }, [])

  const showChatPanel = !isMobile || workspaceView === "chat"
  const showArtifactPanel = !isMobile || workspaceView === "artifact"
  const showBuildTelemetry = isBuildActive

  const artifactPanel = (
    <div className="flex h-full min-h-0 flex-col bg-[#111111]">
      {showBuildTelemetry ? (
        <BuildTelemetry
          buildTrace={buildTrace}
          buildEvaluation={buildEvaluation}
          htmlChars={rawHtmlArtifact?.length ?? 0}
          isStreaming={isStreaming}
          activePhase={pipelinePhase}
          plannerPlan={plannerPlan}
          collapsible={isMobile}
          historyCount={buildHistoryCount}
        />
      ) : null}
      <JarvisPreviewPanel
        htmlContent={rawHtmlArtifact}
        previewHtmlContent={previewHtmlContent}
        isStreaming={isStreaming}
        showSource={artifactTab === "code"}
        showPreview={artifactTab === "preview"}
        emptyPreview={
          !rawHtmlArtifact ? (
            <OrbMindMap
              isPlanning={pipelinePhase === "planner"}
              plan={plannerPlan}
              isStreaming={isBuildActive && isStreaming}
              variant={jarvisMode === "builder" ? "builder" : "chat"}
            />
          ) : undefined
        }
        className="min-h-0 flex-1"
      />
    </div>
  )

  return (
    <div className="jarvis-workspace flex h-dvh flex-col overflow-hidden bg-[#111111] text-[#e8e8e8]">
      <WorkspaceHeader
        projectName={projectName}
        onProjectNameChange={handleProjectNameChange}
        onOpenMenu={() => setIsMenuOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        jarvisMode={jarvisMode}
        builderUnlocked={builderUnlocked}
        onJarvisModeChange={handleJarvisModeChange}
        onBuilderUnlock={handleBuilderUnlock}
        builderUnlockDialogOpen={builderUnlockDialogOpen}
        onBuilderUnlockDialogOpenChange={setBuilderUnlockDialogOpen}
      />

      <WorkspaceMenuDrawer
        open={isMenuOpen}
        onOpenChange={setIsMenuOpen}
        buildHistoryCount={buildHistoryCount}
        chatSessions={chatSessions}
        activeSessionId={activeSessionId}
        onNewChat={clearChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onOpenMemory={handleOpenMemory}
        onClearSessionMemory={handleClearSessionMemory}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportChat={handleExportChat}
        onExportFullBackup={handleExportFullBackup}
        onImportBackup={handleImportBackup}
        sessionSyncEnabled={sessionSyncEnabled}
        onSelectBuildRecord={handleSelectBuildRecord}
        onFocusTelemetry={handleFocusTelemetry}
      />

      {isMemoryOpen ? (
        <MemoryPanel
          conversationId={memoryConversationId ?? conversationId}
          sessionTitle={memorySessionTitle}
          isOpen={isMemoryOpen}
          onClose={handleCloseMemory}
        />
      ) : null}

      <div className="min-h-0 flex-1">
        {isMobile ? (
          <div className="h-full">
            {showChatPanel && (
              <div className="relative flex h-full flex-col">
                <Button
                  onClick={clearChat}
                  variant="ghost"
                  size="icon"
                  className="absolute left-3 top-3 z-10 h-11 w-11 min-h-11 min-w-11 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-[#888] hover:bg-[#222] hover:text-[#ddd] sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8"
                  aria-label="Reset chat"
                >
                  <MessageSquareDashed className="h-4 w-4" />
                </Button>
                <MessageList
                  messages={messages}
                  isStreaming={isStreaming}
                  error={error}
                  onRetry={retry}
                  isLoaded={isLoaded}
                  variant="workspace"
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                />
              </div>
            )}
            {showArtifactPanel && artifactPanel}
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={42} minSize={28}>
              <div className="relative flex h-full flex-col border-r border-[#2a2a2a] bg-[#111111]">
                <Button
                  onClick={clearChat}
                  variant="ghost"
                  size="icon"
                  className="absolute left-3 top-3 z-10 h-11 w-11 min-h-11 min-w-11 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-[#888] hover:bg-[#222] hover:text-[#ddd] sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8"
                  aria-label="Reset chat"
                >
                  <MessageSquareDashed className="h-4 w-4" />
                </Button>
                <MessageList
                  messages={messages}
                  isStreaming={isStreaming}
                  error={error}
                  onRetry={retry}
                  isLoaded={isLoaded}
                  variant="workspace"
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle className="w-px bg-[#2a2a2a]" />

            <ResizablePanel defaultSize={58} minSize={32}>
              {artifactPanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      <WorkspaceFooter
        workspaceView={workspaceView}
        onWorkspaceViewChange={setWorkspaceView}
        artifactTab={artifactTab}
        onArtifactTabChange={setArtifactTab}
        hasArtifact={hasArtifact}
        showArtifactWorkspace={isBuildActive}
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        disabled={!!error}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        apiKeys={keys}
        onPlayPreview={handlePlayPreview}
        onQuickSend={jarvisMode === "builder" ? handleQuickSend : undefined}
        enableBuilderQuickActions={jarvisMode === "builder"}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div
            className="relative flex w-full max-w-md flex-col gap-4 rounded-2xl border border-[#333] bg-[#1a1a1a] p-6 text-[#e8e8e8] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-stone-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                API Keys Configuration
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSettingsOpen(false)}
                className="h-8 w-8 rounded-full text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-stone-500 dark:text-zinc-300">
              Leave a field empty to use the server key from Vercel Environment Variables. Custom keys are saved locally in your browser.
            </p>

            <div className="flex flex-col gap-4 py-2">
              {/* Mistral API Key */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-stone-600 dark:text-zinc-200">Mistral API Key</label>
                <div className="relative">
                  <input
                    type={showKeys.mistral ? "text" : "password"}
                    value={keys.mistral}
                    onChange={(e) => setKeys(prev => ({ ...prev, mistral: e.target.value }))}
                    placeholder="Enter Mistral API Key"
                    className="w-full text-sm text-stone-800 dark:text-zinc-50 placeholder:text-stone-400 dark:placeholder:text-zinc-500 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(prev => ({ ...prev, mistral: !prev.mistral }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showKeys.mistral ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Gemini API Key */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-stone-600 dark:text-zinc-200">Gemini (Google) API Key</label>
                <div className="relative">
                  <input
                    type={showKeys.google ? "text" : "password"}
                    value={keys.google}
                    onChange={(e) => setKeys(prev => ({ ...prev, google: e.target.value }))}
                    placeholder="Enter Gemini API Key"
                    className="w-full text-sm text-stone-800 dark:text-zinc-50 placeholder:text-stone-400 dark:placeholder:text-zinc-500 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(prev => ({ ...prev, google: !prev.google }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showKeys.google ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* OpenAI API Key */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-stone-600 dark:text-zinc-200">OpenAI API Key</label>
                <div className="relative">
                  <input
                    type={showKeys.openai ? "text" : "password"}
                    value={keys.openai}
                    onChange={(e) => setKeys(prev => ({ ...prev, openai: e.target.value }))}
                    placeholder="Enter OpenAI API Key"
                    className="w-full text-sm text-stone-800 dark:text-zinc-50 placeholder:text-stone-400 dark:placeholder:text-zinc-500 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(prev => ({ ...prev, openai: !prev.openai }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Anthropic API Key */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-stone-600 dark:text-zinc-200">Anthropic API Key</label>
                <div className="relative">
                  <input
                    type={showKeys.anthropic ? "text" : "password"}
                    value={keys.anthropic}
                    onChange={(e) => setKeys(prev => ({ ...prev, anthropic: e.target.value }))}
                    placeholder="Enter Anthropic API Key"
                    className="w-full text-sm text-stone-800 dark:text-zinc-50 placeholder:text-stone-400 dark:placeholder:text-zinc-500 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl py-2 pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(prev => ({ ...prev, anthropic: !prev.anthropic }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showKeys.anthropic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-stone-100 dark:border-zinc-800">
              <Button
                variant="ghost"
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-xl border border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSettings}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl"
              >
                Save Keys
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
