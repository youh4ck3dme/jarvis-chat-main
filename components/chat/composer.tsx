"use client"

import type React from "react"

import { useState, useRef, useCallback, type KeyboardEvent, useEffect } from "react"
import { Square, Mic, MicOff, Brain, Paperclip, X, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { AnimatedOrb } from "./animated-orb"
import { AudioWaveform } from "./audio-waveform"

export type AIModel = "google/gemini-2.0-flash-001" | "openai/gpt-4o" | "anthropic/claude-sonnet-4" | "mistral/mistral-large-latest"

export const AI_MODELS: { id: AIModel; name: string; icon: string }[] = [
  { id: "mistral/mistral-large-latest", name: "Mistral", icon: "/images/mistral.svg" },
  { id: "google/gemini-2.0-flash-001", name: "Gemini", icon: "/images/google.webp" },
  { id: "openai/gpt-4o", name: "GPT-4o", icon: "/images/gpt.png" },
  { id: "anthropic/claude-sonnet-4", name: "Claude", icon: "/images/claude.svg" },
]

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
}

export function Composer({ onSend, onStop, isStreaming, disabled, selectedModel, onModelChange, apiKeys }: ComposerProps) {
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
    const audio = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/click-FM4Xaa1FJj237591TiZw4yL1fIxdOw.mp3")
    audio.volume = 0.5
    audio.play().catch(() => {})
  }, [])

  const playRecordSound = useCallback(() => {
    const audio = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/record-CNHOyjcpri6lx5C2sGXncDtFVDwspO.mp3")
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
                    const modelProvider = model.id.split("/")[0] as "mistral" | "google" | "openai" | "anthropic"
                    const hasKey = apiKeys ? apiKeys[modelProvider]?.trim() !== "" : false
                    const hasAnyKey = apiKeys ? Object.values(apiKeys).some((k) => k.trim() !== "") : false
                    const isDisabled = hasAnyKey && !hasKey

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
                            ? "opacity-40 cursor-not-allowed pointer-events-none grayscale" 
                            : "cursor-pointer hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-200",
                          selectedModel === model.id && !isDisabled && "bg-stone-100 dark:bg-zinc-800 text-stone-900 dark:text-zinc-50 font-medium",
                        )}
                      >
                        <Image
                          src={model.icon || "/placeholder.svg"}
                          alt={model.name}
                          width={20}
                          height={20}
                          className={cn("rounded-sm object-contain w-4 h-4", isDisabled && "opacity-60")}
                        />
                        <span className="text-sm">{model.name}</span>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>

            <span className="composer-hint text-xs text-stone-400 dark:text-zinc-300">{currentModel.name}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
