"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { User, Copy, Check, Volume2, Square, Trash2, FileText, Download } from "lucide-react"
import Image from "next/image"
import { AnimatedOrb } from "./animated-orb"
import type { Message } from "./chat-shell"
import { MarkdownRenderer } from "./markdown-renderer"
import {
  downloadArtifact,
  extractExportableArtifacts,
} from "@/lib/chat/assistant-artifact-export"
import { classifyDataUrl } from "@/lib/chat/jarvis-attachments"
import { Logger } from "@/lib/logger"

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  onEdit?: (id: string, newContent: string) => void
  onDelete?: (id: string) => void
}

// Format time for display
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function MessageBubble({ message, isStreaming = false, onEdit, onDelete }: MessageBubbleProps) {
  const isUser = message.role === "user"
  const [copied, setCopied] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const exportableArtifacts = !isUser ? extractExportableArtifacts(message.content) : []
  const attachmentKind = message.attachment ? classifyDataUrl(message.attachment) : null

  // Stop speaking when component unmounts
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        if (typeof window !== "undefined") {
          window.speechSynthesis.cancel()
        }
      }
    }
  }, [isSpeaking])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      Logger.error("Failed to copy text: ", err)
    }
  }

  const handleSpeak = () => {
    if (typeof window === "undefined") return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    window.speechSynthesis.cancel() // Stop any current synthesis

    const utterance = new SpeechSynthesisUtterance(message.content)
    // Simple Slovak language detection
    const hasSlovakChars = /[áéíóúýčďľňťžšĺŕô]/i.test(message.content)
    utterance.lang = hasSlovakChars ? "sk-SK" : "en-US"

    utterance.onstart = () => {
      setIsSpeaking(true)
    }
    utterance.onend = () => {
      setIsSpeaking(false)
    }
    utterance.onerror = () => {
      setIsSpeaking(false)
    }

    window.speechSynthesis.speak(utterance)
  }

  return (
    <div
      className={cn(
        "flex max-w-[90%] md:max-w-[80%] gap-2",
        isUser
          ? "ml-auto flex-row-reverse user-message-enter"
          : "mr-auto animate-in fade-in slide-in-from-bottom-2 duration-300 items-end",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isUser ? "bg-white" : "bg-emerald-600",
          !isUser && isStreaming && "sticky bottom-4 self-end transition-all duration-300",
        )}
        style={{
          boxShadow:
            "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px",
        }}
        aria-hidden="true"
      >
        {isUser ? <User className="w-4 h-4 text-stone-800" /> : <AnimatedOrb className="w-8 h-8 shrink-0" />}
      </div>

      {/* Message content */}
      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
        {/* Role label (optional, shown on larger screens) */}
        <span className="role-label text-xs text-stone-400 dark:text-zinc-300 mb-1 hidden sm:block mt-2">{isUser ? "You" : "Assistant"}</span>

        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl border-none overflow-hidden",
            isUser
              ? "bg-white dark:bg-zinc-800 text-stone-800 dark:text-zinc-50 border border-stone-200 dark:border-zinc-700 rounded-br-md"
              : "assistant-message bg-transparent text-stone-800 dark:text-zinc-50 rounded-bl-md",
          )}
          style={{
            boxShadow: isUser
              ? "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px"
              : "none",
            willChange: isStreaming ? "height" : "auto",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            className={cn(isUser ? "px-4 py-3" : "py-1")}
            style={{
              transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease",
            }}
          >
            {isUser ? (
              <div className="flex flex-col gap-2">
                {message.imageData && (
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-stone-200">
                    <Image
                      src={message.imageData || "/placeholder.svg"}
                      alt="Uploaded image"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {message.attachment && (
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 w-fit pr-4">
                    <div className="w-8 h-8 flex items-center justify-center bg-stone-200 dark:bg-zinc-800 rounded">
                      <FileText className="w-4 h-4 text-stone-500" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-medium text-stone-700 dark:text-zinc-300 max-w-[150px] truncate">
                        {message.attachmentName || "Document"}
                      </span>
                      {attachmentKind && (
                        <span className="text-[10px] uppercase tracking-wide text-stone-500 dark:text-zinc-500">
                          {attachmentKind}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {isEditing ? (
                  <div className="flex flex-col gap-2 mt-1">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full min-w-[200px] min-h-[80px] p-2 text-sm text-stone-800 dark:text-zinc-100 bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-y"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setIsEditing(false);
                          setEditContent(message.content);
                        }}
                        className="text-xs px-2 py-1 rounded bg-stone-200 dark:bg-zinc-700 hover:bg-stone-300 dark:hover:bg-zinc-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          setIsEditing(false);
                          if (onEdit && editContent.trim() !== message.content) {
                            onEdit(message.id, editContent);
                          }
                        }}
                        className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      >
                        Save & Resend
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="user-message-text text-sm whitespace-pre-wrap break-words">{message.content}</p>
                )}
              </div>
            ) : message.narrative ? (
              <p className="border-l-2 border-border pl-3 text-sm italic leading-7 text-subtle">
                {message.content}
              </p>
            ) : (
              <MarkdownRenderer content={message.content || " "} isStreaming={isStreaming} />
            )}
          </div>
        </div>

        {/* Timestamp & Actions */}
        <div className="message-meta flex items-center gap-3 mt-1 text-stone-400 dark:text-zinc-400">
          <span className="text-xs">{formatTime(message.createdAt)}</span>
          <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1 hover:text-stone-700 dark:hover:text-zinc-100 rounded-md transition-colors"
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 animate-in fade-in zoom-in duration-200" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            {isUser && !isStreaming && onEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:text-stone-700 dark:hover:text-zinc-100 rounded-md transition-colors"
                title="Edit message"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
              </button>
            )}
            {!isStreaming && onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 hover:text-red-500 rounded-md transition-colors"
                title="Delete message"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {!isUser && message.content && (
              <button
                onClick={handleSpeak}
                className={cn(
                  "p-1 hover:text-stone-700 dark:hover:text-zinc-100 rounded-md transition-colors",
                  isSpeaking && "text-emerald-600 dark:text-emerald-500"
                )}
                title={isSpeaking ? "Stop speaking" : "Speak message"}
              >
                {isSpeaking ? (
                  <Square className="w-3.5 h-3.5 animate-pulse" fill="currentColor" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            {!isUser && exportableArtifacts.length > 0 && (
              <div className="flex items-center gap-1">
                {exportableArtifacts.slice(0, 3).map((artifact) => (
                  <button
                    key={`${artifact.kind}-${artifact.label}`}
                    onClick={() => downloadArtifact(artifact)}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-stone-500 hover:text-stone-700 dark:text-zinc-500 dark:hover:text-zinc-200"
                    title={`Download ${artifact.label}`}
                  >
                    <Download className="w-3 h-3" />
                    {artifact.kind === "pdf" ? "PDF" : artifact.label.split(".").pop()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
