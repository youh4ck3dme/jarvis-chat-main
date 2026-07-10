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
import Image from "next/image"
import { AnimatedOrb } from "./animated-orb"
import { AudioWaveform } from "./audio-waveform"

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

interface ComposerProps {
  onSend: (content: string, attachment?: string, attachmentName?: string) => void
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

export function Composer({
  onSend,
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
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [showFileBounce, setShowFileBounce] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
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
        recognitionRef.current.lang = "en-US"

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
          console.error("[v0] Speech recognition error:", event.error)
          setIsRecording(false)
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
      baseTextRef.current = value
      finalTranscriptsRef.current = ""
      recognitionRef.current.start()
      setIsRecording(true)

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          setMediaStream(stream)
        })
        .catch((err) => {
          console.error("[v0] Error getting microphone stream:", err)
        })
    }
  }, [isRecording, value, playClickSound, playRecordSound, mediaStream])

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [])

  const clearComposerInput = useCallback(() => {
    setValue("")
    setUploadedFile(null)
    setUploadedFileName(null)
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
    if ((!value.trim() && !uploadedFile) || isStreaming || disabled) return
    playClickSound()

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
    onSend(value || (uploadedFile?.startsWith("data:image/") ? "Describe this image" : "Analyze this document"), uploadedFile || undefined, uploadedFileName || undefined)
    setValue("")
    setUploadedFile(null)
    setUploadedFileName(null)
    baseTextRef.current = ""
    finalTranscriptsRef.current = ""
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [value, uploadedFile, uploadedFileName, isStreaming, disabled, onSend, isRecording, playClickSound])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      playClickSound()

      const file = e.target.files?.[0]
      if (file && (file.type.startsWith("image/") || file.type === "application/pdf" || file.type === "text/plain")) {
        const reader = new FileReader()
        reader.onload = (event) => {
          setUploadedFile(event.target?.result as string)
          setUploadedFileName(file.name)
          setShowFileBounce(true)
          setTimeout(() => setShowFileBounce(false), 400)
        }
        reader.readAsDataURL(file)
      }
      e.target.value = ""
    },
    [playClickSound],
  )

  const removeFile = useCallback(() => {
    setUploadedFile(null)
    setUploadedFileName(null)
  }, [])

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
            const reader = new FileReader()
            reader.onload = (event) => {
              setUploadedFile(event.target?.result as string)
              setUploadedFileName(file.name)
              setShowFileBounce(true)
              setTimeout(() => setShowFileBounce(false), 400)
            }
            reader.readAsDataURL(file)
            break
          }
        }
      }
    },
    [playClickSound],
  )

  const currentModel = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0]
  const isWorkspace = variant === "workspace"

  if (isWorkspace) {
    return (
      <div className="pointer-events-auto">
        <div className="flex items-center gap-2 rounded-2xl border border-[#2f2f2f] bg-[#1c1c1c] px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*, application/pdf, text/plain"
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
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#777] transition-colors hover:bg-[#262626] hover:text-[#ddd] disabled:opacity-40"
            aria-label="Add attachment"
          >
            <Plus className="h-4 w-4" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isStreaming || disabled}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#777] transition-colors hover:bg-[#262626] hover:text-[#ddd] disabled:opacity-40"
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
              className="z-[9999] max-h-[min(70vh,420px)] w-56 overflow-y-auto rounded-xl border border-[#333] bg-[#1c1c1c] px-2 py-2 text-[#e8e8e8] shadow-xl"
            >
              {enableBuilderQuickActions && hasArtifact ? (
                <>
                  <DropdownMenuItem
                    onClick={() => handleQuickSend(QUICK_PROMPTS.completePage)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] hover:bg-[#2a2a2a]"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-emerald-400" />
                    Dokonči stránku
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleQuickSend(QUICK_PROMPTS.addScript)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] hover:bg-[#2a2a2a]"
                  >
                    <Code2 className="h-3.5 w-3.5 text-sky-400" />
                    Pridaj script
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleQuickSend(QUICK_PROMPTS.simplify)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] hover:bg-[#2a2a2a]"
                  >
                    <Minimize2 className="h-3.5 w-3.5 text-amber-400" />
                    Zjednoduš layout
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#333]" />
                </>
              ) : null}

              {enableBuilderQuickActions ? (
                <>
                  <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#666]">
                    Pridaj sekciu
                  </DropdownMenuLabel>
                  {(["addContact", "addPricing", "addFaq", "addFooter"] as QuickPromptKey[]).map(
                    (key) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => handleQuickSend(QUICK_PROMPTS[key])}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] hover:bg-[#2a2a2a]"
                      >
                        <Plus className="h-3.5 w-3.5 text-[#888]" />
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
                  <DropdownMenuSeparator className="bg-[#333]" />
                  <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#666]">
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
                          "cursor-pointer rounded-lg px-2 py-2 text-[13px] hover:bg-[#2a2a2a]",
                          isDisabled && "opacity-40",
                          selectedModel === model.id && !isDisabled && "bg-[#2a2a2a] font-medium",
                        )}
                      >
                        {model.name}
                      </DropdownMenuItem>
                    )
                  })}
                </>
              ) : null}

              <DropdownMenuSeparator className="bg-[#333]" />
              <DropdownMenuItem
                onClick={() => {
                  playClickSound()
                  toggleRecording()
                }}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] hover:bg-[#2a2a2a]"
              >
                <Mic className="h-3.5 w-3.5" />
                {isRecording ? "Zastaviť diktovanie" : "Hlasový vstup"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  playClickSound()
                  clearComposerInput()
                }}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] hover:bg-[#2a2a2a]"
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
              setValue(e.target.value)
              handleInput()
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isRecording ? "Listening..." : "Ask Jarvis..."}
            disabled={isStreaming || disabled}
            rows={1}
            className={cn(
              "composer-input min-h-[36px] max-h-[120px] flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-5 text-[#ececec]",
              "placeholder:text-[#666] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            )}
            aria-label="Message input"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isStreaming || disabled}
                className="hidden h-8 shrink-0 items-center gap-1 rounded-lg border border-[#333] bg-[#222] px-2.5 text-[12px] font-medium text-[#ccc] transition-colors hover:bg-[#2a2a2a] disabled:opacity-40 sm:inline-flex"
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
                className="z-[9999] w-44 rounded-xl border border-[#333] bg-[#1c1c1c] px-2 py-2 text-[#e8e8e8] shadow-xl"
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
                        selectedModel === model.id && !isDisabled && "bg-[#2a2a2a] font-medium",
                      )}
                    >
                      <Image src={model.icon || "/placeholder.svg"} alt={model.name} width={16} height={16} className="h-4 w-4 rounded-sm object-contain" />
                      <span className="flex flex-col items-start leading-tight">
                        <span>{model.name}{model.tier === "fast" ? " ⚡" : ""}</span>
                        <span className="text-[10px] text-[#666]">{model.hint}</span>
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
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
              isRecording
                ? "bg-red-500/20 text-red-400"
                : "text-[#888] hover:bg-[#262626] hover:text-[#ddd]",
            )}
            aria-label={isRecording ? "Stop recording" : "Start voice input"}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          {showPlayButton && onPlayPreview && (
            <button
              type="button"
              onClick={onPlayPreview}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#3a3a3a] bg-[#222] text-[#ddd] transition-colors hover:bg-[#2a2a2a] hover:text-white"
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
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              aria-label="Stop generating"
            >
              <AnimatedOrb size={32} variant="red" />
              <Square className="absolute h-3.5 w-3.5 text-red-700" fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={(!value.trim() && !uploadedFile) || disabled}
              className={cn(
                "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform",
                (!value.trim() && !uploadedFile) || disabled
                  ? "cursor-not-allowed opacity-40"
                  : "hover:scale-105",
              )}
              aria-label="Send message"
            >
              <AnimatedOrb size={32} />
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
          style={{
            boxShadow:
              "rgba(14, 63, 126, 0.06) 0px 0px 0px 1px, rgba(42, 51, 69, 0.06) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.06) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.06) 0px 6px 6px -3px, rgba(14, 63, 126, 0.06) 0px 12px 12px -6px, rgba(14, 63, 126, 0.06) 0px 24px 24px -12px",
          }}
        >
          <div className="flex gap-2 items-center">
            {uploadedFile && (
              <div className={cn("relative shrink-0", showFileBounce && "image-bounce")}>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden border border-stone-200 dark:border-zinc-800 bg-stone-100 dark:bg-zinc-800 flex items-center justify-center">
                  {uploadedFile.startsWith("data:image/") ? (
                    <Image
                      src={uploadedFile}
                      alt="Uploaded image"
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-stone-500 w-full h-full p-1 text-center" title={uploadedFileName || "Document"}>
                      <FileText className="w-4 h-4 mb-0.5 shrink-0" />
                      <span className="text-[9px] font-medium uppercase truncate w-full">
                        {uploadedFileName?.split('.').pop() || "DOC"}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={removeFile}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-stone-800 hover:bg-stone-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-full flex items-center justify-center transition-colors"
                  aria-label="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
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
              <div className="shrink-0 w-24">
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
                disabled={(!value.trim() && !uploadedFile) || disabled}
                className={cn(
                  "relative h-9 w-9 shrink-0 transition-all rounded-full flex items-center justify-center",
                  (!value.trim() && !uploadedFile) || disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:scale-105",
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
              accept="image/*, application/pdf, text/plain"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload file"
            />

            <div className="relative">
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
