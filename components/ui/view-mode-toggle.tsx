"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface ViewModeOption {
  value: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

interface ViewModeToggleProps {
  options: ViewModeOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  size?: "sm" | "default"
  className?: string
  "aria-label"?: string
}

function ViewModeToggle({
  options,
  value,
  defaultValue,
  onValueChange,
  size = "default",
  className,
  "aria-label": ariaLabel = "View mode",
}: ViewModeToggleProps) {
  const isControlled = value !== undefined
  const [internal, setInternal] = React.useState(
    defaultValue ?? options[0]?.value,
  )
  const active = isControlled ? value : internal

  const select = (next: string) => {
    if (!isControlled) setInternal(next)
    onValueChange?.(next)
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === active
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            title={option.label}
            onClick={() => select(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md font-medium transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-3 text-sm",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon ? <Icon className={size === "sm" ? "size-3.5" : "size-4"} /> : null}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export { ViewModeToggle }
