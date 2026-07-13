"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"

import { useJarvisAuth } from "@/hooks/use-jarvis-auth"
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll"
import { MessageSquareDashed, Settings, X, Eye, EyeOff } from "lucide-react"
import dynamic from "next/dynamic"

import { JarvisPreviewPanel } from "@/copied-from-visual-html/components/jarvis/jarvis-preview-panel"
import { useThrottledValue } from "@/copied-from-visual-html/hooks/use-throttled-value"
import { JARVIS_ADVISOR_SYSTEM_PROMPT } from "@/copied-from-visual-html/lib/jarvis-advisor-prompt"
import {
  capPreviewConsoleEntries,
  capPreviewEntries,
  type PreviewConsoleEntry,
  type PreviewErrorEntry,
  type PreviewNavigationEntry,
  type PreviewNetworkEntry,
  type PreviewPerformanceEntry,
} from "@/copied-from-visual-html/lib/preview-console-bridge"
import {
  extractJarvisHtmlArtifact,
  prepareJarvisPreviewHtml,
} from "@/copied-from-visual-html/lib/jarvis-artifacts"
import { readExperienceHint, recordBuildEvaluation } from "@/lib/agents/build-experience"
import { cn } from "@/lib/utils"
import type { BuildEvaluation, BuildTrace } from "@/types/build"
import {
  buildIncompleteHtmlError,
  runBuildPipeline,
  type PipelineChatMessage,
} from "@/lib/chat/build-pipeline"
import {
  buildSelfHealPrompt,
  canRequestSelfHeal,
  MAX_SELF_HEAL_ATTEMPTS,
  type SelfHealIssue,
} from "@/lib/chat/self-heal"
import {
  classifyDataUrl,
  getDefaultAttachmentPrompt,
  splitAttachmentPayload,
} from "@/lib/chat/jarvis-attachments"
import { BuildTelemetry } from "@/components/workspace/build-telemetry"
import { RuntimeInspectorPanel } from "@/components/workspace/runtime-inspector-panel"
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
import { Logger } from "@/lib/logger"
import {
  clearBuildHistoryForSession,
  countBuildHistory,
  listBuildHistory,
  saveBuildHistory,
  type BuildHistoryRecord,
} from "@/lib/build-history/build-history-store"
import { captureHtmlThumbnail } from "@/lib/build-history/capture-thumbnail"
import {
  SnapshotComparePanel,
  SnapshotTimeline,
} from "@/components/workspace/snapshot-timeline"
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
import { exportJarvisProjectZip } from "@/lib/chat/project-zip-export-client"
import {
  fetchSessionSyncStatus,
  mergeLocalWithRemote,
  pullSessionsFromCloud,
  pushSessionsToCloud,
} from "@/lib/chat/session-sync"
import { mergeMemoryFromCloud, pullMemoryFromCloud, pushMemoryToCloud } from "@/lib/memory/memory-sync"
import {
  exportChatAsJson,
  readProjectName,
  saveProjectName,
} from "@/lib/chat/workspace-actions"
import { extractFromMessage, updateConversationSummary, clearConversationMemory, buildAICcontext } from "@/lib/memory"
import { DEFAULT_AI_MODEL, getDefaultAiModel } from "@/lib/default-model"
import { isProviderAuthError } from "@/lib/resolve-api-key"
import { readIsMobileViewport } from "@/lib/workspace/mobile-detect"

export type ArtifactTab = "preview" | "code" | "inspector"

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

function toPipelineMessage(
  message: Pick<Message, "role" | "content" | "imageData" | "attachment" | "attachmentName">,
): PipelineChatMessage {
  return {
    role: message.role,
    content: message.content,
    imageData: message.imageData,
    attachment: message.attachment,
    attachmentName: message.attachmentName,
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
  const messagesRef = useRef<Message[]>([])
  const streamAssistantIdRef = useRef<string | null>(null)
  const streamContentRef = useRef("")
  const streamFlushRafRef = useRef<number | null>(null)
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
  const [inspectorConsoleEntries, setInspectorConsoleEntries] = useState<PreviewConsoleEntry[]>([])
  const [inspectorErrorEntries, setInspectorErrorEntries] = useState<PreviewErrorEntry[]>([])
  const [inspectorNetworkEntries, setInspectorNetworkEntries] = useState<PreviewNetworkEntry[]>([])
  const [inspectorNavigationEntries, setInspectorNavigationEntries] = useState<PreviewNavigationEntry[]>([])
  const [inspectorPerformanceEntries, setInspectorPerformanceEntries] = useState<PreviewPerformanceEntry[]>([])
  const [selfHealAttemptCount, setSelfHealAttemptCount] = useState(0)
  const forceBuilderPipelineRef = useRef(false)
  const [isMobile, setIsMobile] = useState(readIsMobileViewport)
  const [buildEvaluation, setBuildEvaluation] = useState<BuildEvaluation | null>(null)
  const [buildTrace, setBuildTrace] = useState<BuildTrace | null>(null)
  const [buildHistoryCount, setBuildHistoryCount] = useState(0)
  const [snapshotRecords, setSnapshotRecords] = useState<BuildHistoryRecord[]>([])
  const [viewingSnapshot, setViewingSnapshot] = useState<BuildHistoryRecord | null>(null)
  const [comparePair, setComparePair] = useState<{
    before: BuildHistoryRecord
    after: BuildHistoryRecord
  } | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMemoryOpen, setIsMemoryOpen] = useState(false)
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false)
  const [cloudAuthConfigured, setCloudAuthConfigured] = useState(false)
  const { isAuthenticated } = useJarvisAuth()
  const cloudSyncActive = cloudSyncEnabled && cloudAuthConfigured && isAuthenticated
  const deletedSessionIdsRef = useRef<string[]>([])
  const syncPushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [projectName, setProjectName] = useState("Jarvis")
  const [jarvisMode, setJarvisMode] = useState<JarvisMode>("chat")
  const [builderUnlocked, setBuilderUnlocked] = useState(false)
  const builderUnlockedRef = useRef(false)
  const [pipelinePhase, setPipelinePhase] = useState<"planner" | null>(null)
  const [plannerPlan, setPlannerPlan] = useState<BuildPlan | null>(null)
  const [builderUnlockDialogOpen, setBuilderUnlockDialogOpen] = useState(false)
  const pendingBuildPromptRef = useRef<string | null>(null)
  const resumeAfterUnlockRef = useRef(false)
  const pendingSendBatchRef = useRef<
    { content: string; attachment: string; attachmentName: string }[]
  >([])
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
  const isShellMountedRef = useRef(false)

  useEffect(() => {
    isShellMountedRef.current = true
    setMounted(true)
    return () => {
      isShellMountedRef.current = false
      setMounted(false)
    }
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
    if (!mounted || !activeSessionId) {
      setBuildHistoryCount(0)
      setSnapshotRecords([])
      return
    }

    let cancelled = false
    void Promise.all([
      countBuildHistory(activeSessionId),
      listBuildHistory({ sessionId: activeSessionId, limit: 50 }),
    ]).then(([count, records]) => {
      if (cancelled) return
      setBuildHistoryCount(count)
      setSnapshotRecords(records)
    })

    return () => {
      cancelled = true
    }
  }, [mounted, activeSessionId])

  const refreshSnapshotTimeline = useCallback(async (sessionId: string) => {
    const [count, records] = await Promise.all([
      countBuildHistory(sessionId),
      listBuildHistory({ sessionId, limit: 50 }),
    ])
    if (!isShellMountedRef.current) return
    setBuildHistoryCount(count)
    setSnapshotRecords(records)
  }, [])

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

  const displayHtmlArtifact = viewingSnapshot?.html ?? rawHtmlArtifact

  const livePreviewHtml = useMemo(
    () =>
      displayHtmlArtifact
        ? prepareJarvisPreviewHtml(displayHtmlArtifact, {
            streaming: isStreaming && !viewingSnapshot,
          })
        : null,
    [displayHtmlArtifact, isStreaming, viewingSnapshot],
  )

  const previewHtmlContent = useThrottledValue(
    livePreviewHtml,
    isStreaming && !viewingSnapshot ? 200 : 0,
  )
  const hasArtifact = Boolean(displayHtmlArtifact)

  const isBuildActive =
    jarvisMode === "builder" &&
    (isStreaming || pipelinePhase === "planner" || Boolean(plannerPlan) || hasArtifact)

  useEffect(() => {
    if (!isMobile || !isBuildActive) return
    setWorkspaceView("artifact")
    setArtifactTab("preview")
  }, [hasArtifact, isBuildActive, isMobile])

  const conversationId = activeSessionId ?? "default-conversation"

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const flushStreamingAssistantMessage = useCallback(() => {
    const assistantId = streamAssistantIdRef.current
    if (!assistantId) return

    const nextContent = streamContentRef.current
    setMessages((prev) => {
      const target = prev.find((msg) => msg.id === assistantId)
      if (!target || target.content === nextContent) return prev
      return prev.map((msg) =>
        msg.id === assistantId ? { ...msg, content: nextContent } : msg,
      )
    })
  }, [])

  const scheduleStreamingAssistantFlush = useCallback(() => {
    if (streamFlushRafRef.current !== null) return
    streamFlushRafRef.current = requestAnimationFrame(() => {
      streamFlushRafRef.current = null
      flushStreamingAssistantMessage()
    })
  }, [flushStreamingAssistantMessage])

  const clearStreamingAssistantFlush = useCallback(() => {
    if (streamFlushRafRef.current !== null) {
      cancelAnimationFrame(streamFlushRafRef.current)
      streamFlushRafRef.current = null
    }
    streamAssistantIdRef.current = null
    streamContentRef.current = ""
  }, [])

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
      builderUnlockedRef.current = unlocked
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
      Logger.error("Failed to load settings", e)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Persist active session whenever messages or project name change (skip during stream ticks)
  useEffect(() => {
    if (!isLoaded || !activeSessionId || isStreaming) return

    try {
      const nextState = updateActiveSession(loadChatSessionsState(), {
        messages,
        projectName,
      })
      persistChatSessionsState(nextState)
      setChatSessions(nextState.sessions)
    } catch (e) {
      Logger.error("Failed to save chat session", e)
    }
  }, [messages, projectName, isLoaded, activeSessionId, isStreaming])

  useEffect(() => {
    if (!isLoaded) return

    void (async () => {
      const status = await fetchSessionSyncStatus()
      setCloudSyncEnabled(status.enabled)
      setCloudAuthConfigured(status.authConfigured)
      if (!status.enabled || !status.authConfigured || !isAuthenticated) return

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

        const remoteMemory = await pullMemoryFromCloud()
        await mergeMemoryFromCloud(remoteMemory)
      } catch (syncError) {
        Logger.warn("Session sync pull failed", { error: String(syncError) })
      }
    })()
  }, [isLoaded, isAuthenticated])

  useEffect(() => {
    if (!isLoaded || !cloudSyncActive || !activeSessionId || isStreaming) return

    if (syncPushTimerRef.current) {
      clearTimeout(syncPushTimerRef.current)
    }

    syncPushTimerRef.current = setTimeout(() => {
      const state = loadChatSessionsState()
      const conversationIds = state.sessions.map((session) => session.id)
      void Promise.all([
        pushSessionsToCloud(state, deletedSessionIdsRef.current),
        pushMemoryToCloud(conversationIds),
      ])
        .then(() => {
          deletedSessionIdsRef.current = []
        })
        .catch((syncError: unknown) => {
          Logger.warn("Cloud sync push failed", { error: String(syncError) })
        })
    }, 2000)

    return () => {
      if (syncPushTimerRef.current) {
        clearTimeout(syncPushTimerRef.current)
      }
    }
  }, [messages, projectName, chatSessions, isLoaded, cloudSyncActive, activeSessionId, isStreaming])

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
    builderUnlockedRef.current = true
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
    setComparePair(null)
    if (record.html) {
      setViewingSnapshot(record)
    } else {
      setViewingSnapshot(null)
    }
    setArtifactTab("preview")
    setWorkspaceView("artifact")
  }, [])

  const handleBackToLive = useCallback(() => {
    setViewingSnapshot(null)
    setComparePair(null)
  }, [])

  const handleCompareSnapshots = useCallback(
    (before: BuildHistoryRecord, after: BuildHistoryRecord) => {
      setComparePair({ before, after })
      setViewingSnapshot(after)
      setBuildTrace(after.trace)
      setBuildEvaluation(after.evaluation)
      setArtifactTab("preview")
      setWorkspaceView("artifact")
    },
    [],
  )

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

  const handleExportProjectZip = useCallback(async () => {
    const state = loadChatSessionsState()
    await exportJarvisProjectZip(state)
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
      const { imageData, fileAttachment } = splitAttachmentPayload(attachment)
      const attachmentKind = attachment ? classifyDataUrl(attachment) : null
      const defaultAttachmentPrompt = attachmentKind
        ? getDefaultAttachmentPrompt(attachmentKind)
        : "Analyze this document"
      if ((!content.trim() && !attachment) || isStreaming) return

      const trimmedContent = content.trim()
      const buildIntent = detectBuildIntent(trimmedContent)
      const forceBuilderPipeline = forceBuilderPipelineRef.current
      if (forceBuilderPipeline) {
        forceBuilderPipelineRef.current = false
      }

      if (jarvisMode === "chat" && buildIntent && !builderUnlockedRef.current && !forceBuilderPipeline) {
        pendingBuildPromptRef.current = trimmedContent
        const lockedUserMessage: Message = {
          id: generateId(),
          role: "user",
          content: trimmedContent || defaultAttachmentPrompt,
          createdAt: new Date(),
          imageData,
          attachment: fileAttachment,
          attachmentName: fileAttachment ? attachmentName : undefined,
        }
        const hintMessage = createNarrativeBeat(generateId(), JARVIS_BUILDER_LOCKED_HINT)
        setMessages((prev) => [...prev, lockedUserMessage, hintMessage])
        setBuilderUnlockDialogOpen(true)
        return
      }

      const runBuilderPipeline =
        forceBuilderPipeline ||
        jarvisMode === "builder" ||
        (buildIntent && builderUnlockedRef.current)

      if (runBuilderPipeline && jarvisMode === "chat" && (buildIntent || forceBuilderPipeline)) {
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

      const currentMessages = messagesRef.current

      const existingLockedUserMessage =
        isResumeAfterUnlock
          ? [...currentMessages]
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
          content: content.trim() || defaultAttachmentPrompt,
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
      if (runBuilderPipeline && buildIntent && !forceBuilderPipeline) {
        storyBeats.push(createNarrativeBeat(generateId(), JARVIS_STORY_BUILD_INTENT))
      }

      const baseHistory = existingLockedUserMessage
        ? currentMessages
        : [...currentMessages, userMessage]
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
        streamAssistantIdRef.current = assistantMsg.id
        streamContentRef.current = ""

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

          streamContentRef.current = accumulatedContent
          scheduleStreamingAssistantFlush()
        }

        if (streamFlushRafRef.current !== null) {
          cancelAnimationFrame(streamFlushRafRef.current)
          streamFlushRafRef.current = null
        }
        flushStreamingAssistantMessage()

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
          Logger.warn("Failed to update memory", { error: String(memoryError) })
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
            Logger.warn("Failed to build memory context", { error: String(contextError) })
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
          Logger.warn("Failed to build memory context", { error: String(contextError) })
        }

        const pipelineResult = await runBuildPipeline({
          priorHistory: messagesRef.current.map(toPipelineMessage),
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
          const thumbnailDataUrl = (await captureHtmlThumbnail(artifact)) ?? undefined
          const saved = await saveBuildHistory({
            sessionId: conversationId,
            userPrompt: userMessage.content,
            evaluation,
            trace,
            htmlChars: artifact.length,
            planSummary: trace.phases.find((phase) => phase.phase === "planner")?.detail,
            html: artifact,
            thumbnailDataUrl,
          })
          if (saved) {
            setViewingSnapshot(null)
            void refreshSnapshotTimeline(conversationId)
          }
        }

        if (artifact && evaluation && !evaluation.ok) {
          setError(buildIncompleteHtmlError(evaluation, refinementRounds))
        }

        if (artifact && evaluation?.ok) {
          setSelfHealAttemptCount(0)
          setInspectorConsoleEntries([])
          setInspectorErrorEntries([])
          setInspectorNetworkEntries([])
          setInspectorNavigationEntries([])
          setInspectorPerformanceEntries([])
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
          Logger.error("Error sending message", e)
          setError(e instanceof Error ? e.message : "An error occurred")
          setMessages((prev) => prev.filter((msg) => msg.id !== activeAssistantMessage.id))
        }
      } finally {
        clearStreamingAssistantFlush()
        setIsStreaming(false)
        setAbortController(null)
      }
    },
    [
      isStreaming,
      selectedModel,
      jarvisMode,
      builderUnlocked,
      conversationId,
      scheduleStreamingAssistantFlush,
      flushStreamingAssistantMessage,
      clearStreamingAssistantFlush,
      refreshSnapshotTimeline,
    ],
  )

  sendMessageRef.current = sendMessage

  const handleSelfHealFix = useCallback(
    (issue: SelfHealIssue) => {
      if (!rawHtmlArtifact || isStreaming) return

      if (!builderUnlockedRef.current) {
        setError("Builder must be unlocked before Jarvis can self-heal the artifact.")
        return
      }

      if (!canRequestSelfHeal(selfHealAttemptCount)) {
        setError(
          `Self-heal limit reached (${MAX_SELF_HEAL_ATTEMPTS} attempts). Fix manually or start a new build.`,
        )
        return
      }

      setSelfHealAttemptCount((current) => current + 1)
      forceBuilderPipelineRef.current = true
      setJarvisMode("builder")
      persistJarvisMode("builder")
      setWorkspaceView("artifact")
      setArtifactTab("preview")
      setError(null)
      void sendMessage(buildSelfHealPrompt(issue, rawHtmlArtifact))
    },
    [isStreaming, rawHtmlArtifact, selfHealAttemptCount, sendMessage],
  )

  const sendMessageBatch = useCallback(
    (items: { content: string; attachment: string; attachmentName: string }[]) => {
      if (items.length === 0 || isStreaming) return
      const [first, ...rest] = items
      pendingSendBatchRef.current = rest
      void sendMessage(first.content, first.attachment, first.attachmentName)
    },
    [isStreaming, sendMessage],
  )

  useEffect(() => {
    if (isStreaming || pendingSendBatchRef.current.length === 0) return
    const [next, ...rest] = pendingSendBatchRef.current
    pendingSendBatchRef.current = rest
    void sendMessage(next.content, next.attachment, next.attachmentName)
  }, [isStreaming, sendMessage])

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
      const retryAttachment = lastUserMessage.imageData ?? lastUserMessage.attachment
      setTimeout(
        () =>
          sendMessage(
            lastUserMessage.content,
            retryAttachment,
            lastUserMessage.attachmentName,
          ),
        100,
      )
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
    setInspectorConsoleEntries([])
    setInspectorErrorEntries([])
    setInspectorNetworkEntries([])
    setInspectorNavigationEntries([])
    setInspectorPerformanceEntries([])
    setSelfHealAttemptCount(0)
    setViewingSnapshot(null)
    setComparePair(null)
    setSnapshotRecords([])
  }, [])

  const clearInspectorEntries = useCallback(() => {
    setInspectorConsoleEntries([])
    setInspectorErrorEntries([])
    setInspectorNetworkEntries([])
    setInspectorNavigationEntries([])
    setInspectorPerformanceEntries([])
  }, [])

  const handleInspectorConsoleEntry = useCallback((entry: PreviewConsoleEntry) => {
    setInspectorConsoleEntries((current) => capPreviewConsoleEntries([...current, entry]))
  }, [])

  const handleInspectorNavigationEntry = useCallback((entry: PreviewNavigationEntry) => {
    setInspectorNavigationEntries((current) => capPreviewEntries([...current, entry]))
  }, [])

  const handleInspectorErrorEntry = useCallback((entry: PreviewErrorEntry) => {
    setInspectorErrorEntries((current) => capPreviewEntries([...current, entry]))
  }, [])

  const handleInspectorNetworkEntry = useCallback((entry: PreviewNetworkEntry) => {
    setInspectorNetworkEntries((current) => capPreviewEntries([...current, entry]))
  }, [])

  const handleInspectorPerformanceEntry = useCallback((entry: PreviewPerformanceEntry) => {
    setInspectorPerformanceEntries((current) => capPreviewEntries([...current, entry]))
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
        Logger.warn("Failed to clear session memory", { error: String(err) })
      })
      clearBuildHistoryForSession(sessionId).catch((err: unknown) => {
        Logger.warn("Failed to clear session build history", { error: String(err) })
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
    <div className="flex h-full min-h-0 flex-col bg-background">
      {showBuildTelemetry ? (
        <BuildTelemetry
          buildTrace={buildTrace}
          buildEvaluation={buildEvaluation}
          htmlChars={(displayHtmlArtifact ?? rawHtmlArtifact)?.length ?? 0}
          isStreaming={isStreaming}
          activePhase={pipelinePhase}
          plannerPlan={plannerPlan}
          collapsible={isMobile}
          historyCount={buildHistoryCount}
        />
      ) : null}
      {snapshotRecords.length > 0 ? (
        <SnapshotTimeline
          records={snapshotRecords}
          selectedId={viewingSnapshot?.id}
          compareId={comparePair?.after.id}
          onSelect={handleSelectBuildRecord}
          onCompare={handleCompareSnapshots}
        />
      ) : null}
      {comparePair ? (
        <SnapshotComparePanel
          before={comparePair.before}
          after={comparePair.after}
          onClose={() => setComparePair(null)}
        />
      ) : null}
      {artifactTab === "inspector" ? (
        <RuntimeInspectorPanel
          className="min-h-0 flex-1"
          state={{
            consoleEntries: inspectorConsoleEntries,
            errorEntries: inspectorErrorEntries,
            networkEntries: inspectorNetworkEntries,
            navigationEntries: inspectorNavigationEntries,
            performanceEntries: inspectorPerformanceEntries,
          }}
          onClear={clearInspectorEntries}
          onFixIssue={rawHtmlArtifact ? handleSelfHealFix : undefined}
          canSelfHeal={
            Boolean(rawHtmlArtifact) &&
            builderUnlocked &&
            canRequestSelfHeal(selfHealAttemptCount) &&
            !isStreaming
          }
          isSelfHealBusy={isStreaming}
          selfHealAttempt={selfHealAttemptCount}
          selfHealMaxAttempts={MAX_SELF_HEAL_ATTEMPTS}
        />
      ) : null}
      <JarvisPreviewPanel
        htmlContent={displayHtmlArtifact}
        previewHtmlContent={previewHtmlContent}
        isStreaming={isStreaming && !viewingSnapshot}
        isViewingSnapshot={Boolean(viewingSnapshot)}
        onBackToLive={handleBackToLive}
        showSource={artifactTab === "code"}
        showPreview={artifactTab === "preview"}
        hiddenSandbox={artifactTab === "inspector"}
        onConsoleEntry={displayHtmlArtifact && !viewingSnapshot ? handleInspectorConsoleEntry : undefined}
        onNavigationEntry={displayHtmlArtifact && !viewingSnapshot ? handleInspectorNavigationEntry : undefined}
        onErrorEntry={displayHtmlArtifact && !viewingSnapshot ? handleInspectorErrorEntry : undefined}
        onNetworkEntry={displayHtmlArtifact && !viewingSnapshot ? handleInspectorNetworkEntry : undefined}
        onPerformanceEntry={
          displayHtmlArtifact && !viewingSnapshot ? handleInspectorPerformanceEntry : undefined
        }
        emptyPreview={
          !displayHtmlArtifact ? (
            <OrbMindMap
              isPlanning={pipelinePhase === "planner"}
              plan={plannerPlan}
              isStreaming={isBuildActive && isStreaming}
              variant={jarvisMode === "builder" ? "builder" : "chat"}
            />
          ) : undefined
        }
        className={cn(
          "min-h-0",
          artifactTab === "inspector" ? "h-px overflow-hidden opacity-0" : "flex-1",
        )}
      />
    </div>
  )

  const isWorkspaceLanding = messages.length === 0 && !isStreaming && !error
  useLockBodyScroll(isWorkspaceLanding)

  return (
    <div
      className={cn(
        "jarvis-workspace flex h-dvh max-h-dvh flex-col overflow-hidden bg-background text-fg",
        isWorkspaceLanding && "jarvis-workspace--landing",
      )}
    >
      <div className="mesh-grid-texture" aria-hidden />
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
        onExportProjectZip={handleExportProjectZip}
        onImportBackup={handleImportBackup}
        cloudSyncEnabled={cloudSyncEnabled}
        cloudAuthConfigured={cloudAuthConfigured}
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
        {!mounted || isMobile ? (
          <div className="h-full">
            {showChatPanel && (
              <div className="relative flex h-full min-h-0 flex-col">
                <Button
                  onClick={clearChat}
                  variant="ghost"
                  size="icon"
                  className="absolute left-3 top-3 z-10 h-11 w-11 min-h-11 min-w-11 rounded-lg border border-border bg-surface text-muted-foreground hover:bg-surface hover:text-fg/80 sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8"
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
                  onLandingPrompt={sendMessage}
                />
              </div>
            )}
            {mounted && showArtifactPanel && artifactPanel}
          </div>
        ) : null}
        {mounted && !isMobile ? (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={42} minSize={28}>
              <div className="relative flex h-full flex-col border-r border-border bg-background">
                <Button
                  onClick={clearChat}
                  variant="ghost"
                  size="icon"
                  className="absolute left-3 top-3 z-10 h-11 w-11 min-h-11 min-w-11 rounded-lg border border-border bg-surface text-muted-foreground hover:bg-surface hover:text-fg/80 sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8"
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
                  onLandingPrompt={sendMessage}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle className="w-px bg-border/50" />

            <ResizablePanel defaultSize={58} minSize={32}>
              {artifactPanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : null}
      </div>

      <WorkspaceFooter
        workspaceView={workspaceView}
        onWorkspaceViewChange={setWorkspaceView}
        artifactTab={artifactTab}
        onArtifactTabChange={setArtifactTab}
        hasArtifact={hasArtifact}
        showArtifactWorkspace={isBuildActive}
        onSend={sendMessage}
        onSendBatch={sendMessageBatch}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        disabled={!!error}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        apiKeys={keys}
        onPlayPreview={handlePlayPreview}
        onQuickSend={jarvisMode === "builder" ? handleQuickSend : undefined}
        enableBuilderQuickActions={jarvisMode === "builder"}
        lockLayout={isWorkspaceLanding}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div
            className="relative flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-surface p-6 text-fg shadow-2xl"
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
      <div className="procedural-noise-grain" aria-hidden />
    </div>
  )
}
