"use client"

import { useState, useEffect, useCallback } from "react"
import { MessageSquareDashed, Sun, Moon, Settings, X, Eye, EyeOff } from "lucide-react"
import { useTheme } from "next-themes"
import { MessageList } from "./message-list"
import { Composer, type AIModel } from "./composer"
import { Button } from "@/components/ui/button"
import { isProviderAuthError } from "@/lib/resolve-api-key"

// Data model for messages
export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
  imageData?: string
}

// localStorage keys
const STORAGE_KEY = "chat-messages"
const MODEL_STORAGE_KEY = "chat-selected-model"
const MISTRAL_KEY_STORAGE = "settings-mistral-key"
const GOOGLE_KEY_STORAGE = "settings-google-key"
const OPENAI_KEY_STORAGE = "settings-openai-key"
const ANTHROPIC_KEY_STORAGE = "settings-anthropic-key"

// Generates a unique ID for messages
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
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
      if (typeof data?.error === "string" && data.error.trim()) {
        return data.error
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
  const [selectedModel, setSelectedModel] = useState<AIModel>("mistral/mistral-large-latest")
  const [isLoaded, setIsLoaded] = useState(false)
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

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

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load state and keys from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const messagesWithDates = parsed.map((msg: Message) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }))
        setMessages(messagesWithDates)
      }
      const savedModel = localStorage.getItem(MODEL_STORAGE_KEY) as AIModel | null
      const googleKey = localStorage.getItem(GOOGLE_KEY_STORAGE)?.trim()
      if (savedModel?.startsWith("google/") && !googleKey) {
        setSelectedModel("mistral/mistral-large-latest")
        localStorage.setItem(MODEL_STORAGE_KEY, "mistral/mistral-large-latest")
      } else if (savedModel) {
        setSelectedModel(savedModel)
      }

      setKeys({
        mistral: localStorage.getItem(MISTRAL_KEY_STORAGE) || "",
        google: localStorage.getItem(GOOGLE_KEY_STORAGE) || "",
        openai: localStorage.getItem(OPENAI_KEY_STORAGE) || "",
        anthropic: localStorage.getItem(ANTHROPIC_KEY_STORAGE) || "",
      })
    } catch (e) {
      console.error("Failed to load settings:", e)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch (e) {
      console.error("Failed to save messages to localStorage:", e)
    }
  }, [messages])

  const handleModelChange = useCallback((model: AIModel) => {
    setSelectedModel(model)
    localStorage.setItem(MODEL_STORAGE_KEY, model)
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
    async (content: string, imageData?: string) => {
      if ((!content.trim() && !imageData) || isStreaming) return

      setError(null)

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: content.trim() || "Describe this image",
        createdAt: new Date(),
        imageData,
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        createdAt: new Date(),
      }

      const newMessages = [...messages, userMessage, assistantMessage]
      setMessages(newMessages)
      setIsStreaming(true)

      const controller = new AbortController()
      setAbortController(controller)

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...buildApiKeyHeaders(),
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
              imageData: m.imageData,
            })),
            model: selectedModel,
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
            prev.map((msg) => (msg.id === assistantMessage.id ? { ...msg, content: accumulatedContent } : msg)),
          )
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id ? { ...msg, content: msg.content || "[Cancelled]" } : msg,
            ),
          )
        } else {
          console.error("Error sending message:", e)
          setError(e instanceof Error ? e.message : "An error occurred")
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessage.id))
        }
      } finally {
        setIsStreaming(false)
        setAbortController(null)
      }
    },
    [messages, isStreaming, selectedModel],
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

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <div
      className="jarvis-chat relative h-dvh bg-stone-50 dark:bg-zinc-950 transition-colors duration-300"
      style={{
        boxShadow:
          "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px",
      }}
    >
      <Button
        onClick={clearChat}
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 z-20 h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-stone-600 dark:text-zinc-100 border border-border/40 shadow-sm transition-colors"
        aria-label="Reset chat"
      >
        <MessageSquareDashed className="w-5 h-5" />
      </Button>

      {mounted && (
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <Button
            onClick={() => setIsSettingsOpen(true)}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-stone-600 dark:text-zinc-100 border border-border/40 shadow-sm transition-colors"
            aria-label="Open settings"
          >
            <Settings className="w-5 h-5" />
          </Button>

          <Button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-stone-600 dark:text-zinc-100 border border-border/40 shadow-sm transition-all duration-300"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="w-5 h-5 transition-transform duration-300 rotate-0 scale-100" />
            ) : (
              <Moon className="w-5 h-5 transition-transform duration-300 rotate-0 scale-100" />
            )}
          </Button>
        </div>
      )}

      <MessageList messages={messages} isStreaming={isStreaming} error={error} onRetry={retry} isLoaded={isLoaded} />

      <Composer
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        disabled={!!error}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div 
            className="w-full max-w-md bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl relative flex flex-col gap-4 animate-in zoom-in-95 duration-200 text-stone-800 dark:text-zinc-50"
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
