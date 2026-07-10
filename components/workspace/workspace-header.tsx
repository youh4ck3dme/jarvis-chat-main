"use client"

import { useState } from "react"
import { Check, ChevronDown, Menu, Pencil, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { JarvisModeControl } from "@/components/workspace/jarvis-mode-control"
import type { JarvisMode } from "@/lib/chat/jarvis-mode"
import { cn } from "@/lib/utils"

interface WorkspaceHeaderProps {
  projectName: string
  onProjectNameChange: (name: string) => void
  onOpenMenu: () => void
  onOpenSettings: () => void
  jarvisMode: JarvisMode
  builderUnlocked: boolean
  onJarvisModeChange: (mode: JarvisMode) => void
  onBuilderUnlock: () => void
  builderUnlockDialogOpen?: boolean
  onBuilderUnlockDialogOpenChange?: (open: boolean) => void
  className?: string
}

export function WorkspaceHeader({
  projectName,
  onProjectNameChange,
  onOpenMenu,
  onOpenSettings,
  jarvisMode,
  builderUnlocked,
  onJarvisModeChange,
  onBuilderUnlock,
  builderUnlockDialogOpen,
  onBuilderUnlockDialogOpenChange,
  className,
}: WorkspaceHeaderProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [draftName, setDraftName] = useState(projectName)

  const commitRename = () => {
    const trimmed = draftName.trim() || "Jarvis"
    onProjectNameChange(trimmed)
    setDraftName(trimmed)
    setIsRenaming(false)
  }

  return (
    <header
      className={cn(
        "flex min-h-12 shrink-0 items-center justify-between gap-1 border-b border-[#2a2a2a] bg-[#141414] px-2 pt-[env(safe-area-inset-top)] sm:h-12 sm:gap-2 sm:px-3 md:px-4",
        className,
      )}
      data-testid="workspace-header"
    >
      <div className="flex min-w-0 shrink items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-[#888] transition-colors hover:bg-[#222] hover:text-[#ddd] sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8"
          aria-label="Open workspace menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <span
          className="jarvis-header-title-mobile max-w-[6.5rem] truncate text-[12px] font-medium text-[#c8c8c8] sm:hidden"
          title={projectName}
        >
          {projectName}
        </span>

        <DropdownMenu
          onOpenChange={(open) => {
            if (open) setDraftName(projectName)
            if (!open) setIsRenaming(false)
          }}
        >
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hidden items-center gap-1 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-[13px] font-medium text-[#e0e0e0] transition-colors hover:border-[#333] hover:bg-[#222] sm:inline-flex"
              aria-label="Project menu"
            >
              <span className="max-w-[10rem] truncate">{projectName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#666]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent
              align="start"
              className="z-[9999] w-56 rounded-xl border border-[#333] bg-[#1c1c1c] p-2 text-[#e8e8e8] shadow-xl"
            >
              {isRenaming ? (
                <div className="space-y-2 px-1 py-1">
                  <input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitRename()
                      if (event.key === "Escape") setIsRenaming(false)
                    }}
                    className="w-full rounded-lg border border-[#333] bg-[#111] px-2.5 py-1.5 text-[13px] text-[#ececec] focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                    aria-label="Project name"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={commitRename}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-700"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Uložiť názov
                  </button>
                </div>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => setIsRenaming(true)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] hover:bg-[#2a2a2a]"
                  >
                    <Pencil className="h-3.5 w-3.5 text-[#888]" />
                    Premenovať projekt
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onOpenMenu}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[13px] hover:bg-[#2a2a2a]"
                  >
                    <Menu className="h-3.5 w-3.5 text-[#888]" />
                    Workspace menu
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      </div>

      <JarvisModeControl
        mode={jarvisMode}
        builderUnlocked={builderUnlocked}
        onModeChange={onJarvisModeChange}
        onBuilderUnlock={onBuilderUnlock}
        unlockDialogOpen={builderUnlockDialogOpen}
        onUnlockDialogOpenChange={onBuilderUnlockDialogOpenChange}
      />

      <Button
        onClick={onOpenSettings}
        variant="ghost"
        size="icon"
        className="h-11 w-11 min-h-11 min-w-11 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] text-[#888] hover:bg-[#222] hover:text-[#ddd] sm:h-8 sm:w-8 sm:min-h-8 sm:min-w-8"
        aria-label="Open settings"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </header>
  )
}