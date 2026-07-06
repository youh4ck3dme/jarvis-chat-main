"use client"

import { Button } from "@/components/ui/button"
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChatSession } from "./chat-shell"

interface ChatSidebarProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isOpen,
  setIsOpen,
}: ChatSidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed md:relative top-0 left-0 h-full w-64 bg-stone-50 dark:bg-zinc-950 border-r border-stone-200 dark:border-zinc-800 flex flex-col transition-transform duration-300 z-50",
          isOpen ? "translate-x-0" : "-translate-x-full md:w-0 md:border-none",
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-stone-200 dark:border-zinc-800">
          <Button
            onClick={() => {
              onNewSession()
              if (window.innerWidth < 768) setIsOpen(false)
            }}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="ml-2 md:hidden"
          >
            <PanelLeftClose className="w-4 h-4 text-stone-500" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {sessions.length === 0 ? (
            <div className="text-center p-4 text-sm text-stone-400 dark:text-zinc-500">
              No previous chats.
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm",
                  currentSessionId === session.id
                    ? "bg-stone-200 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 font-medium"
                    : "text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800/50 hover:text-stone-900 dark:hover:text-zinc-200"
                )}
                onClick={() => {
                  onSelectSession(session.id)
                  if (window.innerWidth < 768) setIsOpen(false)
                }}
              >
                <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
                <span className="flex-1 truncate">{session.name || "New Chat"}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteSession(session.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-opacity p-1"
                  aria-label="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Toggle button when sidebar is closed (desktop only) */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-40 hidden md:flex h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-stone-600 dark:text-zinc-100 shadow-sm"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </Button>
      )}

      {/* Mobile toggle button (always visible when closed on mobile) */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-40 md:hidden h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-stone-600 dark:text-zinc-100 shadow-sm"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </Button>
      )}
    </>
  )
}
