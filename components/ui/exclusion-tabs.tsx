"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface ExclusionTabItem {
  value: string
  label: React.ReactNode
}

interface ExclusionTabsProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  items: ExclusionTabItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

function ExclusionTabs({
  items,
  value,
  defaultValue,
  onValueChange,
  className,
  ...props
}: ExclusionTabsProps) {
  const isControlled = value !== undefined
  const [internal, setInternal] = React.useState(
    defaultValue ?? items[0]?.value,
  )
  const active = isControlled ? value : internal

  const listRef = React.useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = React.useState({ left: 0, width: 0 })

  const updateIndicator = React.useCallback(() => {
    const list = listRef.current
    if (!list) return
    const activeEl = list.querySelector<HTMLButtonElement>(
      `[data-value="${active}"]`,
    )
    if (!activeEl) return
    setIndicator({
      left: activeEl.offsetLeft,
      width: activeEl.offsetWidth,
    })
  }, [active])

  React.useLayoutEffect(() => {
    updateIndicator()
  }, [updateIndicator])

  React.useEffect(() => {
    window.addEventListener("resize", updateIndicator)
    return () => window.removeEventListener("resize", updateIndicator)
  }, [updateIndicator])

  const select = (next: string) => {
    if (!isControlled) setInternal(next)
    onValueChange?.(next)
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      className={cn(
        "relative inline-flex items-center gap-1 rounded-full border border-border bg-muted p-1",
        className,
      )}
      {...props}
    >
      {/* Blend-mode indicator: inverts whatever text sits above it */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 rounded-full bg-foreground transition-[left,width] duration-300 ease-out"
        style={{
          left: indicator.left,
          width: indicator.width,
          mixBlendMode: "exclusion",
        }}
      />
      {items.map((item) => {
        const isActive = item.value === active
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-value={item.value}
            onClick={() => select(item.value)}
            className={cn(
              "relative z-10 rounded-full px-4 py-1.5 text-sm font-medium text-foreground transition-colors",
              "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              !isActive && "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export { ExclusionTabs }
