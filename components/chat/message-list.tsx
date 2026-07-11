"use client"

import { useEffect, useRef, useState } from "react"
import { MessageBubble } from "./message-bubble"
import type { Message } from "./chat-shell"
import { TypingIndicator } from "./typing-indicator"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { JARVIS_STORY_OPENING } from "@/lib/chat/jarvis-story"
import { AnimatedOrb } from "./animated-orb"

const LANDING_STARTERS = [
  { label: "Ahoj Jarvis", prompt: "Ahoj Jarvis" },
  { label: "Čo vieš postaviť?", prompt: "Čo vieš postaviť?" },
  { label: "Landing page", prompt: "Urob mi landing page" },
] as const

interface MessageListProps {
  messages: Message[]
  isStreaming: boolean
  error: string | null
  onRetry: () => void
  isLoaded: boolean
  onEditMessage?: (id: string, newContent: string) => void
  onDeleteMessage?: (id: string) => void
  onLandingPrompt?: (prompt: string) => void
  variant?: "default" | "workspace"
}

import { SOUND_LAUNCH_URL } from "@/lib/sounds"
export const INTRO_PLAYED_KEY = "jarvis-intro-last-played"
export const INTRO_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour in milliseconds

/**
 * Check if the intro sound should play:
 * - First visit ever → play
 * - Subsequent visits → only if 1+ hour has passed since last play
 */
export function shouldPlayIntro(): boolean {
  try {
    const lastPlayed = localStorage.getItem(INTRO_PLAYED_KEY)
    if (!lastPlayed) return true // First visit ever
    const elapsed = Date.now() - parseInt(lastPlayed, 10)
    return elapsed >= INTRO_COOLDOWN_MS
  } catch {
    return false // If localStorage is unavailable, don't play
  }
}

export function markIntroPlayed(): void {
  try {
    localStorage.setItem(INTRO_PLAYED_KEY, Date.now().toString())
  } catch {
    // Ignore storage errors
  }
}

function WorkspaceLanding({
  className,
  onLandingPrompt,
}: {
  className?: string
  onLandingPrompt?: (prompt: string) => void
}) {
  return (
    <div
      data-testid="jarvis-empty-state"
      className={cn("jarvis-landing-static jarvis-landing-hero px-4 text-center", className)}
    >
      <div className="jarvis-landing-content pointer-events-none flex flex-col items-center">
        <div className="mb-5">
          <AnimatedOrb
            size={72}
            motion="static"
            className="shadow-[0_0_48px_rgba(16,185,129,0.18)]"
          />
        </div>
        <p className="mb-3 text-[22px] font-semibold tracking-tight text-fg">Ahoj, som Jarvis</p>
        <p className="max-w-md text-[14px] italic leading-7 text-subtle">{JARVIS_STORY_OPENING}</p>
        <p className="mt-4 max-w-sm text-[13px] leading-6 text-muted-foreground">
          Začni rozhovor — alebo vyber rýchly štart nižšie.
        </p>
      </div>

      {onLandingPrompt ? (
        <div className="mt-6 flex w-full max-w-sm flex-wrap items-center justify-center gap-2">
          {LANDING_STARTERS.map((starter) => (
            <button
              key={starter.prompt}
              type="button"
              onClick={() => onLandingPrompt(starter.prompt)}
              className="jarvis-starter-chip pointer-events-auto min-h-11 rounded-full px-4 py-2 text-[13px] font-medium text-fg/80"
            >
              {starter.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function MessageList({
  messages,
  isStreaming,
  error,
  onRetry,
  isLoaded,
  onEditMessage,
  onDeleteMessage,
  onLandingPrompt,
  variant = "default",
}: MessageListProps) {
  const isWorkspace = variant === "workspace"
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const rafRef = useRef<number | null>(null)
  const [hasAnimated, setHasAnimated] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastScrollRef = useRef<number>(0)
  const hasPlayedIntroRef = useRef(false) // Track if intro has played in this session

  const isEmptyLanding = messages.length === 0 && !error && !isStreaming
  const showStaticWorkspaceLanding = isWorkspace && isEmptyLanding

  useEffect(() => {
    if (!isLoaded || isWorkspace) return

    // Only animate if no messages were loaded (fresh start) AND cooldown has passed
    if (messages.length === 0 && !hasPlayedIntroRef.current && shouldPlayIntro()) {
      setHasAnimated(true)
      hasPlayedIntroRef.current = true
      markIntroPlayed()

      audioRef.current = new Audio(SOUND_LAUNCH_URL)
      audioRef.current.volume = 0.5
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors - browser may block without user interaction
      })
    } else if (messages.length > 0 || hasPlayedIntroRef.current) {
      // Skip animation if messages exist or already played this session
      if (messages.length > 0) setHasAnimated(false)
      hasPlayedIntroRef.current = true
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [isLoaded, isWorkspace, messages.length])

  useEffect(() => {
    if (!containerRef.current || messages.length === 0) return
    const container = containerRef.current
    container.scrollTop = container.scrollHeight
    setAutoScroll(true)
  }, [messages.length])

  useEffect(() => {
    if (!isStreaming || !autoScroll || !containerRef.current) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const container = containerRef.current
    lastScrollRef.current = container.scrollTop

    const smoothScroll = () => {
      if (!container) return

      const { scrollHeight, clientHeight } = container
      const targetScroll = scrollHeight - clientHeight
      const currentScroll = lastScrollRef.current
      const diff = targetScroll - currentScroll

      if (diff > 0.5) {
        const newScroll = currentScroll + diff * 0.03
        lastScrollRef.current = newScroll
        container.scrollTop = newScroll
      }

      rafRef.current = requestAnimationFrame(smoothScroll)
    }

    // Start immediately
    rafRef.current = requestAnimationFrame(smoothScroll)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isStreaming, autoScroll])

  // Detect if user scrolls up to disable auto-scroll
  const handleScroll = () => {
    if (!containerRef.current || isStreaming) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150
    setAutoScroll(isAtBottom)
  }

  const lastMessage = messages[messages.length - 1]
  const showTypingIndicator =
    isStreaming &&
    (messages.length === 0 ||
      lastMessage?.role === "user" ||
      (lastMessage?.role === "assistant" && lastMessage?.content === ""))

  if (!isLoaded && isWorkspace) {
    return (
      <div className="absolute inset-0 overflow-hidden overscroll-none border-none pt-14 md:pt-14">
        <WorkspaceLanding onLandingPrompt={onLandingPrompt} />
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatedOrb size={64} />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={showStaticWorkspaceLanding ? undefined : handleScroll}
      className={
        isWorkspace
          ? cn(
              "absolute inset-0 border-none",
              showStaticWorkspaceLanding
                ? "touch-none overflow-hidden overscroll-none"
                : "space-y-3 overflow-y-auto px-4 pb-4 pt-14 md:px-5 [scrollbar-color:#333_transparent] [scrollbar-width:thin]",
            )
          : "absolute inset-0 overflow-y-auto space-y-4 border-none px-4 pb-36 pt-16 md:px-6"
      }
      role="log"
      aria-label="Chat messages"
      aria-live={showStaticWorkspaceLanding ? "off" : "polite"}
    >
      {showStaticWorkspaceLanding ? (
        <WorkspaceLanding onLandingPrompt={onLandingPrompt} />
      ) : null}

      {/* Empty state (default variant only) */}
      {!isWorkspace && isEmptyLanding ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <p className="mb-2 text-2xl font-semibold text-stone-800 dark:text-zinc-50">
            Hi, my name is Jarvis
          </p>
          <p className="px-4 text-base text-stone-600 dark:text-zinc-300">
            Send a message to begin chatting with the AI assistant
          </p>
        </div>
      ) : null}

      {/* Messages */}
      {messages
        .filter((message) => {
          // Hide empty assistant messages during streaming - they'll be shown as typing indicator instead
          if (isStreaming && message.role === "assistant" && message === lastMessage && message.content === "") {
            return false
          }
          return true
        })
        .map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={isStreaming && message.role === "assistant" && message === lastMessage}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
          />
        ))}

      {showTypingIndicator && <TypingIndicator />}

      {/* Error state */}
      {error && (
        <div
          className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl"
          role="alert"
          style={{
            boxShadow:
              "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px",
          }}
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Something went wrong</p>
            <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">{error}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="text-red-600 hover:text-red-700 hover:bg-red-100 transition-colors"
            aria-label="Retry sending message"
          >
            <RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {!showStaticWorkspaceLanding ? (
        <div ref={bottomRef} aria-hidden="true" className="h-20" />
      ) : null}
    </div>
  )
}
