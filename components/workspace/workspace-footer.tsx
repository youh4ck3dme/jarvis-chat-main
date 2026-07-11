"use client"

import { ChevronLeft, Code2, Eye, Play } from "lucide-react"

import { Composer, type AIModel, type ComposerSendItem } from "@/components/chat/composer"
import { useVisualViewportPadding } from "@/hooks/use-visual-viewport-padding"
import { cn } from "@/lib/utils"

import type { ArtifactTab } from "@/components/chat/chat-shell"

export type WorkspaceView = "chat" | "artifact"

interface WorkspaceFooterProps {
  workspaceView: WorkspaceView
  onWorkspaceViewChange: (view: WorkspaceView) => void
  artifactTab: ArtifactTab
  onArtifactTabChange: (tab: ArtifactTab) => void
  hasArtifact: boolean
  /** Show Preview/Code tabs during planner/stream even before HTML exists */
  showArtifactWorkspace?: boolean
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
  onPlayPreview: () => void
  onQuickSend?: (prompt: string) => void
  enableBuilderQuickActions?: boolean
}

export function WorkspaceFooter({
  workspaceView,
  onWorkspaceViewChange,
  artifactTab,
  onArtifactTabChange,
  hasArtifact,
  showArtifactWorkspace = false,
  onSend,
  onSendBatch,
  onStop,
  isStreaming,
  disabled,
  selectedModel,
  onModelChange,
  apiKeys,
  onPlayPreview,
  onQuickSend,
  enableBuilderQuickActions = false,
}: WorkspaceFooterProps) {
  const keyboardPadding = useVisualViewportPadding()
  const showArtifactTabs = hasArtifact || showArtifactWorkspace

  return (
    <footer
      className="safe-bottom shrink-0 border-t border-border bg-background/95 backdrop-blur-md"
      data-testid="workspace-footer"
      style={
        keyboardPadding > 0
          ? {
              paddingBottom: `calc(max(1rem, env(safe-area-inset-bottom)) + ${keyboardPadding}px)`,
            }
          : undefined
      }
    >
      {showArtifactTabs ? (
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border px-2 py-2 sm:gap-2 sm:px-3 md:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => onWorkspaceViewChange("chat")}
          className={cn(
            "inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-[13px] font-medium transition-colors sm:min-h-8",
            workspaceView === "chat"
              ? "border-border bg-surface text-fg"
              : "border-border bg-surface text-muted-foreground hover:border-border hover:text-fg/80",
          )}
          aria-label="Back to chat"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Chat
        </button>

        {(hasArtifact || showArtifactWorkspace) && (
          <div className="ml-1 flex items-center rounded-lg border border-border bg-surface p-0.5">
            <button
              type="button"
              onClick={() => {
                onArtifactTabChange("preview")
                onWorkspaceViewChange("artifact")
              }}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors sm:min-h-7",
                artifactTab === "preview" && workspaceView === "artifact"
                  ? "bg-border/50 text-fg"
                  : "text-muted-foreground hover:text-fg/70",
              )}
            >
              <Eye className="h-3.5 w-3.5 shrink-0" />
              <span className="max-[420px]:hidden sm:inline">Live </span>Preview
            </button>
            <button
              type="button"
              onClick={() => {
                onArtifactTabChange("code")
                onWorkspaceViewChange("artifact")
              }}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors sm:min-h-7",
                artifactTab === "code" && workspaceView === "artifact"
                  ? "bg-border/50 text-fg"
                  : "text-muted-foreground hover:text-fg/70",
              )}
            >
              <Code2 className="h-3.5 w-3.5 shrink-0" />
              <span className="max-[420px]:hidden sm:inline">Generated </span>Code
            </button>
          </div>
        )}

        {(hasArtifact || showArtifactWorkspace) && workspaceView === "artifact" && (
          <button
            type="button"
            onClick={onPlayPreview}
            className="ml-auto flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-surface text-fg/80 transition-colors hover:bg-surface hover:text-white sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8 md:hidden"
            aria-label="Run preview"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
          </button>
        )}
      </div>
      ) : null}

      <div className="relative bg-gradient-to-t from-background via-background to-transparent px-3 py-2.5 md:px-4 md:py-3">
        <Composer
          variant="workspace"
          onSend={onSend}
          onSendBatch={onSendBatch}
          onStop={onStop}
          isStreaming={isStreaming}
          disabled={disabled}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          apiKeys={apiKeys}
          onPlayPreview={onPlayPreview}
          showPlayButton={hasArtifact}
          hasArtifact={hasArtifact}
          onQuickSend={onQuickSend}
          enableBuilderQuickActions={enableBuilderQuickActions}
        />
      </div>
    </footer>
  )
}