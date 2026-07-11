"use client"

import type React from "react"

import { useState, useRef, useCallback, type KeyboardEvent, useEffect } from "react"
import {
  Square,
  Mic,
  MicOff,
  Paperclip,
  X,
  FileText,
  Play,
  Plus,
  MoreHorizontal,
  ChevronDown,
  Wand2,
  Code2,
  Minimize2,
  Eraser,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logger } from "@/lib/logger"
import { SOUND_CLICK_URL, SOUND_RECORD_URL } from "@/lib/sounds"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { useIsMobile } from "@/components/ui/use-mobile"
import { QUICK_PROMPTS, type QuickPromptKey } from "@/lib/chat/workspace-actions"
import {
  classifyDataUrl,
  getDefaultAttachmentPrompt,
  JARVIS_ATTACHMENT_ACCEPT,
  readAttachmentFromFile,
} from "@/lib/chat/jarvis-attachments"
import Image from "next/image"
import { AnimatedOrb } from "./animated-orb"
import { AudioWaveform } from "./audio-waveform"
import { useDesktopAgent } from "@/lib/desktop-agent/use-desktop-agent"
import {
  getSpeechRecognitionErrorMessage,
  isIgnorableSpeechError,
  resolveSpeechRecognitionLang,
} from "@/lib/speech-recognition"

export type AIModel =
  | "google/gemini-2.0-flash-001"
  | "mistral/mistral-small-latest"
  | "mistral/mistral-large-latest"
  | "openai/gpt-4o-mini"
  | "openai/gpt-4o"
  | "anthropic/claude-sonnet-4"

export type AIModelTier = "fast" | "quality"

export const AI_MODELS: {
  id: AIModel
  name: string
  icon: string
  tier: AIModelTier
  hint: string
  requiresKey?: "google" | "openai" | "anthropic"
}[] = [
  {
    id: "mistral/mistral-small-latest",
    name: "Mistral Small",
    icon: "/images/mistral.svg",
    tier: "fast",
    hint: "Rýchly — default (tvoj MISTRAL_API_KEY)",
  },
  {
    id: "mistral/mistral-large-latest",
    name: "Mistral Large",
    icon: "/images/mistral.svg",
    tier: "quality",
    hint: "Kvalitnejší, pomalší",
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini Flash",
    icon: "/images/google.webp",
    tier: "fast",
    hint: "Vyžaduje GEMINI_API_KEY v Settings",
    requiresKey: "google",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    icon: "/images/gpt.png",
    tier: "fast",
    hint: "Vyžaduje OPENAI_API_KEY v Settings",
    requiresKey: "openai",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    icon: "/images/gpt.png",
    tier: "quality",
    hint: "Vyžaduje OPENAI_API_KEY v Settings",
    requiresKey: "openai",
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude",
    icon: "/images/claude.svg",
    tier: "quality",
    hint: "Vyžaduje ANTHROPIC_API_KEY v Settings",
    requiresKey: "anthropic",
  },
]

/** Mistral works with server MISTRAL_API_KEY; others need a key in Settings or env. */
export function isModelAvailable(
  model: (typeof AI_MODELS)[number],
  apiKeys?: { mistral: string; google: string; openai: string; anthropic: string },
): boolean {
  if (!model.requiresKey) return true
  const key = apiKeys?.[model.requiresKey]?.trim()
  return Boolean(key)
}

export type ComposerAttachmentItem = {
  id: string
  dataUrl: string
  fileName: string
}

export type ComposerSendItem = {
  content: string
  attachment: string
  attachmentName: string
}

const MAX_COMPOSER_ATTACHMENTS = 10

interface ComposerProps {
  onSend: (content: string, attachment?: string, attachmentName?: string) => void
  onSendBatch?: (items: ComposerSendItem[]) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
  selectedModel: AIModel
  onModelChange: (model: AIModel) => void
  apiKeys?: {
    mistral: string
    google: string
    openai: string
    anthropic: string
  }
  variant?: "default" | "workspace"
  onPlayPreview?: () => void
  showPlayButton?: boolean
  hasArtifact?: boolean
  onQuickSend?: (prompt: string) => void
  enableBuilderQuickActions?: boolean
}

function createAttachmentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function Composer({
  onSend,
  onSendBatch,
  onStop,
  isStreaming,
  disabled,
  selectedModel,
  onModelChange,
  apiKeys,
  variant = "default",
  onPlayPreview,
  showPlayButton = false,
  hasArtifact = false,
  onQuickSend,
  enableBuilderQuickActions = false,
}: ComposerProps) {
  const isMobile = useIsMobile()
  const [value, setValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const { connectionState: desktopAgentState } = useDesktopAgent()
  const speechRetryRef = useRef(0)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const desktopAgentOnlineRef = useRef(false)
  const [pendingAttachments, setPendingAttachments] = useState<ComposerAttachmentItem[]>([])
  const [showFileBounce, setShowFileBounce] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const dragDepthRef = useRef(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    desktopAgentOnlineRef.current = desktopAgentState === "online"
  }, [desktopAgentState])

  useEffect(() => {
    mediaStreamRef.current = mediaStream
  }, [mediaStream])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const baseTextRef = useRef("")
  const finalTranscriptsRef = useRef("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = resolveSpeechRecognitionLang()

        recognitionRef.current.onresult = (event: any) => {
          let newFinalText = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              const transcript = event.results[i][0].transcript
              newFinalText += transcript + " "
            }
          }

          if (newFinalText) {
            finalTranscriptsRef.current += newFinalText
            setValue(baseTextRef.current + finalTranscriptsRef.current)
            setTimeout(() => handleInput(), 0)
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          const code = String(event.error ?? "unknown")

          if (code === "network" && speechRetryRef.current < 1) {
            speechRetryRef.current += 1
            window.setTimeout(() => {
              try {
                recognitionRef.current?.start()
              } catch {
                /* already started or unavailable */
              }
            }, 400)
            return
          }

          setIsRecording(false)
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop())
            mediaStreamRef.current = null
            setMediaStream(null)
          }

          if (isIgnorableSpeechError(code)) {
            if (code === "no-speech") {
              setSpeechError(getSpeechRecognitionErrorMessage(code))
            }
            return
          }

          const message = getSpeechRecognitionErrorMessage(code, {
            desktopAgentOnline: desktopAgentOnlineRef.current,
          })
          setSpeechError(message)
          Logger.warn("Speech recognition error", { code, message })
        }

        recognitionRef.current.onend = () => {
          setIsRecording(false)
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  useEffect(() => {
    // Trigger intro animation after mount
    setHasAnimated(true)
  }, [])

  useEffect(() => {
    if (!speechError) return
    const timer = window.setTimeout(() => setSpeechError(null), 8000)
    return () => window.clearTimeout(timer)
  }, [speechError])

  const playClickSound = useCallback(() => {
    const audio = new Audio(SOUND_CLICK_URL)
    audio.volume = 0.5
    audio.play().catch(() => {})
  }, [])

  const playRecordSound = useCallback(() => {
    const audio = new Audio(SOUND_RECORD_URL)
    audio.volume = 0.5
    audio.play().catch(() => {})
  }, [])

  const toggleRecording = useCallback(() => {
    playClickSound()

    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser")
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop())
        setMediaStream(null)
      }
    } else {
      playRecordSound()
      setSpeechError(null)
      speechRetryRef.current = 0
      baseTextRef.current = value
      finalTranscriptsRef.current = ""
      try {
        recognitionRef.current.start()
      } catch (err) {
        Logger.warn("Speech recognition start failed", { error: String(err) })
        setSpeechError(
          getSpeechRecognitionErrorMessage("network", {
            desktopAgentOnline: desktopAgentState === "online",
          }),
        )
        return
      }
      setIsRecording(true)

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          setMediaStream(stream)
        })
        .catch((err) => {
          Logger.error("Error getting microphone stream", err)
        })
    }
  }, [isRecording, value, playClickSound, playRecordSound, mediaStream, desktopAgentState])

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [])

  const clearComposerInput = useCallback(() => {
    setValue("")
    setPendingAttachments([])
    baseTextRef.current = ""
    finalTranscriptsRef.current = ""
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [])

  const handleQuickSend = useCallback(
    (prompt: string) => {
      if (isStreaming || disabled) return
      playClickSound()
      if (onQuickSend) {
        onQuickSend(prompt)
      } else {
        onSend(prompt)
      }
      clearComposerInput()
    },
    [clearComposerInput, disabled, isStreaming, onQuickSend, onSend, playClickSound],
  )

  const handleSend = useCallback(() => {
    if ((!value.trim() && pendingAttachments.length === 0) || isStreaming || disabled) return
    playClickSound()

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }

    if (pendingAttachments.length > 1 && onSendBatch) {
      const items: ComposerSendItem[] = pendingAttachments.map((attachment, index) => {
        const kind = classifyDataUrl(attachment.dataUrl)
        const fallbackPrompt = kind ? getDefaultAttachmentPrompt(kind) : "Analyze this document"
        return {
          content: index === 0 ? value.trim() || fallbackPrompt : fallbackPrompt,
          attachment: attachment.dataUrl,
          attachmentName: attachment.fileName,
        }
      })
      onSendBatch(items)
    } else {
      const primaryAttachment = pendingAttachments[0]
      const attachmentKind = primaryAttachment ? classifyDataUrl(primaryAttachment.dataUrl) : null
      const fallbackPrompt = attachmentKind
        ? getDefaultAttachmentPrompt(attachmentKind)
        : "Analyze this document"
      onSend(
        value || fallbackPrompt,
        primaryAttachment?.dataUrl,
        primaryAttachment?.fileName,
      )
    }

    setValue("")
    setPendingAttachments([])
    baseTextRef.current = ""
    finalTranscriptsRef.current = ""
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [value, pendingAttachments, isStreaming, disabled, onSend, onSendBatch, isRecording, playClickSound])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const attachFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    const parsedAttachments: ComposerAttachmentItem[] = []

    for (const file of fileArray) {
      if (parsedAttachments.length + pendingAttachments.length >= MAX_COMPOSER_ATTACHMENTS) {
        break
      }

      try {
        const parsed = await readAttachmentFromFile(file)
        parsedAttachments.push({
          id: createAttachmentId(),
          dataUrl: parsed.dataUrl,
          fileName: parsed.fileName,
        })
      } catch (error) {
        Logger.error("Unsupported attachment", error)
      }
    }

    if (parsedAttachments.length === 0) return

    setPendingAttachments((current) =>
      [...current, ...parsedAttachments].slice(0, MAX_COMPOSER_ATTACHMENTS),
    )
    setShowFileBounce(true)
    setTimeout(() => setShowFileBounce(false), 400)
  }, [pendingAttachments.length])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      playClickSound()

      const files = e.target.files
      if (files && files.length > 0) {
        void attachFiles(files)
      }
      e.target.value = ""
    },
    [attachFiles, playClickSound],
  )

  const removeAttachment = useCallback((attachmentId: string) => {
    setPendingAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId))
  }, [])

  const hasFileDrag = useCallback((event: React.DragEvent) => {
    return Array.from(event.dataTransfer.types).includes("Files")
  }, [])

  const handleDragEnter = useCallback(
    (event: React.DragEvent) => {
      if (!hasFileDrag(event) || isStreaming || disabled) return
      event.preventDefault()
      dragDepthRef.current += 1
      setIsDragOver(true)
    },
    [disabled, hasFileDrag, isStreaming],
  )

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      if (!hasFileDrag(event) || isStreaming || disabled) return
      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
    },
    [disabled, hasFileDrag, isStreaming],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      if (!hasFileDrag(event) || isStreaming || disabled) return
      event.preventDefault()
      dragDepthRef.current = 0
      setIsDragOver(false)
      playClickSound()
      void attachFiles(event.dataTransfer.files)
    },
    [attachFiles, disabled, hasFileDrag, isStreaming, playClickSound],
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            playClickSound()
            void attachFiles([file])
            break
          }
        }
      }
    },
    [attachFiles, playClickSound],
  )

  const renderAttachmentChip = (
    attachment: ComposerAttachmentItem,
    variant: "workspace" | "default",
  ) => {
    const attachmentKind = classifyDataUrl(attachment.dataUrl)

    if (variant === "workspace") {
      return (
        <div
          key={attachment.id}
          className="flex w-fit max-w-full items-center gap-2 rounded-xl border border-border bg-surface px-2 py-1.5"
        >
          {attachmentKind === "image" ? (
            <Image
              src={attachment.dataUrl}
              alt="Uploaded attachment"
              width={32}
              height={32}
              className="h-8 w-8 rounded object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded bg-surface text-[10px] font-semibold uppercase text-subtle">
              {attachmentKind}
            </div>
          )}
          <span className="truncate text-[12px] text-fg/80">{attachment.fileName}</span>
          <button
            type="button"
            onClick={() => removeAttachment(attachment.id)}
            className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-fg/80"
            aria-label={`Remove attachment ${attachment.fileName}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )
    }

    return (
      <div key={attachment.id} className={cn("relative shrink-0", showFileBounce && "image-bounce")}>
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-stone-100 dark:border-zinc-800 dark:bg-zinc-800 md:h-12 md:w-12">
          {attachmentKind === "image" ? (
            <Image
              src={attachment.dataUrl}
              alt="Uploaded attachment"
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center p-1 text-center text-stone-500"
              title={attachment.fileName}
            >
              <FileText className="mb-0.5 h-4 w-4 shrink-0" />
              <span className="w-full truncate text-[9px] font-medium uppercase">
                {attachmentKind || attachment.fileName.split(".").pop() || "DOC"}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => removeAttachment(attachment.id)}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-stone-800 text-white transition-colors hover:bg-stone-900 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          aria-label={`Remove attachment ${attachment.fileName}`}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  const canSend = Boolean(value.trim() || pendingAttachments.length > 0)
  const currentModel = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0]
  const isWorkspace = variant === "workspace"
  const workspaceIconBtn =
    "flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8 sm:rounded-lg"
  const workspaceSendSize = isMobile ? 40 : 32

  if (isWorkspace) {
    return (
      <div
        data-testid="composer-drop-zone"
        className="pointer-events-auto"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {pendingAttachments.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingAttachments.map((attachment) => renderAttachmentChip(attachment, "workspace"))}
          </div>
        ) : null}
        <div className="jarvis-composer-shell focus-ring relative flex items-center gap-2 rounded-2xl border border-border bg-panel p-1 backdrop-blur-sm">
          {isDragOver ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/60 bg-emerald-950/30 text-[12px] font-medium text-emerald-300">
              Pusti súbory sem (max {MAX_COMPOSER_ATTACHMENTS})
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={JARVIS_ATTACHMENT_ACCEPT}
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload file"
          />

          <button
            type="button"
            onClick={() => {
              playClickSound()
              fileInputRef.current?.click()
            }}
            disabled={isStreaming || disabled}
            className={cn(
              workspaceIconBtn,
              "text-muted-foreground transition-colors hover:bg-surface hover:text-fg/80 disabled:opacity-40",
            )}
            aria-label="Add attachment"
            title="JPEG, HEIC, PNG, WebP, PDF, HTML"
          >
            <Plus className="h-4 w-4" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isStreaming || disabled}
                className={cn(
                  workspaceIconBtn,
                  "text-muted-foreground transition-colors hover:bg-surface hover:text-fg/80 disabled:opacity-40",
                )}
                aria-label="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="top"
              sideOffset={8}
              collisionPadding={12}
              className="z-[9999] max-h-[min(70vh,420px)] w-56 overflow-y-auto rounded-xl border border-border bg-panel px-2 py-2 text-fg shadow-xl"
            >
              {enableBuilderQuickActions && hasArtifact ? (
                <>
                  <DropdownMenuItem
                    onClick={() => handleQuickSend(QUICK_PROMPTS.completePage)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] hover:bg-border/50"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-emerald-400" />
                    Dokonči stránku
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleQuickSend(QUICK_PROMPTS.addScript)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] hover:bg-border/50"
                  >
                    <Code2 className="h-3.5 w-3.5 text-sky-400" />
                    Pridaj script
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleQuickSend(QUICK_PROMPTS.simplify)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] hover:bg-border/50"
                  >
                    <Minimize2 className="h-3.5 w-3.5 text-amber-400" />
                    Zjednoduš layout
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                </>
              ) : null}

              {enableBuilderQuickActions ? (
                <>
                  <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Pridaj sekciu
                  </DropdownMenuLabel>
                  {(["addContact", "addPricing", "addFaq", "addFooter"] as QuickPromptKey[]).map(
                    (key) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => handleQuickSend(QUICK_PROMPTS[key])}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] hover:bg-border/50"
                      >
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                        {key === "addContact" && "Contact"}
                        {key === "addPricing" && "Pricing"}
                        {key === "addFaq" && "FAQ"}
                        {key === "addFooter" && "Footer"}
                      </DropdownMenuItem>
                    ),
                  )}
                </>
              ) : null}

              {isMobile ? (
                <>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Zmeniť model
                  </DropdownMenuLabel>
                  {AI_MODELS.map((model) => {
                    const isDisabled = !isModelAvailable(model, apiKeys)
                    return (
                      <DropdownMenuItem
                        key={model.id}
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return
                          playClickSound()
                          onModelChange(model.id)
                        }}
                        className={cn(
                          "cursor-pointer rounded-lg px-2 py-2 text-[13px] hover:bg-border/50",
                          isDisabled && "opacity-40",
                          selectedModel === model.id && !isDisabled && "bg-border/50 font-medium",
                        )}
                      >
                        {model.name}
                      </DropdownMenuItem>
                    )
                  })}
                </>
              ) : null}

              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => {
                  playClickSound()
                  toggleRecording()
                }}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] hover:bg-border/50"
              >
                <Mic className="h-3.5 w-3.5" />
                {isRecording ? "Zastaviť diktovanie" : "Hlasový vstup"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  playClickSound()
                  clearComposerInput()
                }}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] hover:bg-border/50"
              >
                <Eraser className="h-3.5 w-3.5" />
                Vymazať input
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              if (speechError) setSpeechError(null)
              setValue(e.target.value)
              handleInput()
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isRecording ? "Počúvam…" : "Spýtaj sa Jarvisa…"}
            disabled={isStreaming || disabled}
            rows={1}
            className={cn(
              "composer-input min-h-[36px] max-h-[120px] flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-5 text-fg",
              "placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            )}
            aria-label="Message input"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isStreaming || disabled}
                className="hidden h-8 shrink-0 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-[12px] font-medium text-fg/80 transition-colors hover:bg-border/50 disabled:opacity-40 sm:inline-flex"
              >
                Build
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent
                align="end"
                side="top"
                sideOffset={8}
                className="z-[9999] w-44 rounded-xl border border-border bg-panel px-2 py-2 text-fg shadow-xl"
              >
                {AI_MODELS.map((model) => {
                  const isDisabled = !isModelAvailable(model, apiKeys)

                  return (
                    <DropdownMenuItem
                      key={model.id}
                      disabled={isDisabled}
                      onClick={(e) => {
                        if (isDisabled) {
                          e.preventDefault()
                          return
                        }
                        playClickSound()
                        onModelChange(model.id)
                      }}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px]",
                        isDisabled && "pointer-events-none opacity-40",
                        selectedModel === model.id && !isDisabled && "bg-border/50 font-medium",
                      )}
                    >
                      <Image src={model.icon || "/placeholder.svg"} alt={model.name} width={16} height={16} className="h-4 w-4 rounded-sm object-contain" />
                      <span className="flex flex-col items-start leading-tight">
                        <span>{model.name}{model.tier === "fast" ? " ⚡" : ""}</span>
                        <span className="text-[10px] text-muted-foreground">{model.hint}</span>
                      </span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>

          <button
            type="button"
            onClick={toggleRecording}
            disabled={isStreaming || disabled}
            className={cn(
              workspaceIconBtn,
              "transition-colors",
              isRecording
                ? "bg-red-500/20 text-red-400"
                : "text-muted-foreground hover:bg-surface hover:text-fg/80",
            )}
            aria-label={isRecording ? "Stop recording" : "Start voice input"}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          {speechError ? (
            <p className="max-w-[220px] text-[10px] leading-snug text-amber-400/90" role="status">
              {speechError}
            </p>
          ) : null}

          {showPlayButton && onPlayPreview && (
            <button
              type="button"
              onClick={onPlayPreview}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-fg/80 transition-colors hover:bg-border/50 hover:text-white"
              aria-label="Open live preview"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
            </button>
          )}

          {isStreaming ? (
            <button
              onClick={() => {
                playClickSound()
                onStop()
              }}
              className={cn(
                workspaceIconBtn,
                "relative rounded-full",
              )}
              aria-label="Stop generating"
            >
              <AnimatedOrb size={workspaceSendSize} variant="red" />
              <Square className="absolute h-3.5 w-3.5 text-red-700" fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend || disabled}
              className={cn(
                workspaceIconBtn,
                "relative rounded-full transition-transform",
                !canSend || disabled ? "cursor-not-allowed opacity-40" : "hover:scale-105 active:scale-95",
              )}
              aria-label="Send message"
            >
              <AnimatedOrb size={workspaceSendSize} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("fixed bottom-3 md:bottom-4 left-0 right-0 px-3 md:px-4 pointer-events-none z-10", hasAnimated && "composer-intro")}>
      <div className="relative max-w-2xl mx-auto pointer-events-auto">
        <div
          className={cn(
            "flex flex-col gap-2 md:gap-3 p-3 md:p-4 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 transition-all duration-200 overflow-hidden relative rounded-3xl",
            "focus-within:border-stone-300 dark:focus-within:border-zinc-700 focus-within:ring-2 focus-within:ring-stone-200 dark:focus-within:ring-zinc-800",
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            boxShadow:
              "rgba(14, 63, 126, 0.06) 0px 0px 0px 1px, rgba(42, 51, 69, 0.06) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.06) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.06) 0px 6px 6px -3px, rgba(14, 63, 126, 0.06) 0px 12px 12px -6px, rgba(14, 63, 126, 0.06) 0px 24px 24px -12px",
          }}
        >
          {isDragOver ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-3xl border-2 border-dashed border-emerald-500/60 bg-emerald-50/80 text-sm font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              Drop files here (max {MAX_COMPOSER_ATTACHMENTS})
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {pendingAttachments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {pendingAttachments.map((attachment) => renderAttachmentChip(attachment, "default"))}
              </div>
            ) : null}

            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                if (speechError) setSpeechError(null)
                setValue(e.target.value)
                handleInput()
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={isRecording ? "Listening..." : "Type a message... (Shift+Enter for new line)"}
              disabled={isStreaming || disabled}
              rows={1}
              className={cn(
                "composer-input flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-stone-800 dark:text-zinc-50 placeholder:text-stone-400 dark:placeholder:text-zinc-500",
                "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
                "max-h-[56px] overflow-y-auto",
              )}
              aria-label="Message input"
            />

            {isRecording && (
              <div className="w-24 shrink-0 animate-fade-in">
                <AudioWaveform isRecording={isRecording} stream={mediaStream} />
              </div>
            )}

            {isStreaming ? (
              <button
                onClick={() => {
                  playClickSound()
                  onStop()
                }}
                className="relative h-9 w-9 shrink-0 transition-all rounded-full flex items-center justify-center cursor-pointer hover:scale-105"
                aria-label="Stop generating"
              >
                <AnimatedOrb size={36} variant="red" />
                <Square
                  className="w-4 h-4 absolute drop-shadow-md text-red-700"
                  fill="currentColor"
                  aria-hidden="true"
                />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!canSend || disabled}
                className={cn(
                  "relative h-9 w-9 shrink-0 transition-all rounded-full flex items-center justify-center",
                  !canSend || disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105",
                )}
                aria-label="Send message"
              >
                <AnimatedOrb size={36} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={JARVIS_ATTACHMENT_ACCEPT}
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload file"
            />

            <div className="relative flex flex-col items-center gap-1">
              <Button
                onClick={toggleRecording}
                disabled={isStreaming || disabled}
                size="icon"
                className={cn(
                  "h-9 w-9 shrink-0 transition-all rounded-full relative z-10",
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 text-white animate-bounce-subtle"
                    : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-100",
                )}
                aria-label={isRecording ? "Stop recording" : "Start voice input"}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              {speechError ? (
                <p className="max-w-[200px] text-center text-[10px] leading-snug text-amber-600 dark:text-amber-400" role="status">
                  {speechError}
                </p>
              ) : null}
            </div>

            <Button
              onClick={() => {
                playClickSound()
                fileInputRef.current?.click()
              }}
              disabled={isStreaming || disabled}
              size="icon"
              className="h-9 w-9 shrink-0 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-100 rounded-full"
              aria-label="Attach image"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger className="bg-zinc-100 dark:bg-zinc-800" asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isStreaming || disabled}
                  className="h-9 w-9 shrink-0 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-100 rounded-full overflow-hidden flex items-center justify-center p-0"
                  aria-label="Select AI model"
                  onClick={playClickSound}
                >
                  <Image
                    src={currentModel.icon}
                    alt={currentModel.name}
                    width={20}
                    height={20}
                    className="rounded-full object-contain w-5 h-5"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent
                  align="start"
                  side="top"
                  sideOffset={8}
                  className="w-40 px-2 py-2 rounded-2xl z-[9999] bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-stone-800 dark:text-zinc-50 shadow-md"
                >
                  {AI_MODELS.map((model) => {
                    const isDisabled = !isModelAvailable(model, apiKeys)

                    return (
                      <DropdownMenuItem
                        key={model.id}
                        disabled={isDisabled}
                        onClick={(e) => {
                          if (isDisabled) {
                            e.preventDefault()
                            return
                          }
                          playClickSound()
                          onModelChange(model.id)
                        }}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors",
                          isDisabled
                            ? "pointer-events-none cursor-not-allowed opacity-40 grayscale"
                            : "cursor-pointer text-stone-700 hover:bg-stone-50 dark:text-zinc-200 dark:hover:bg-zinc-800",
                          selectedModel === model.id && !isDisabled && "bg-stone-100 font-medium text-stone-900 dark:bg-zinc-800 dark:text-zinc-50",
                        )}
                      >
                        <Image
                          src={model.icon || "/placeholder.svg"}
                          alt={model.name}
                          width={20}
                          height={20}
                          className={cn("rounded-sm object-contain w-4 h-4", isDisabled && "opacity-60")}
                        />
                        <span className="text-sm">
                          {model.name}
                          {model.tier === "fast" ? " ⚡" : ""}
                        </span>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>

            <span className="composer-hint text-xs text-stone-400 dark:text-zinc-300">
              {currentModel.name}{currentModel.tier === "fast" ? " ⚡" : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
