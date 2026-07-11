import { cn } from "@/lib/utils"

type SendActionsIconProps = {
  className?: string
  size?: number
}

/** si:actions-line — circle + send/play glyph (Iconify Simple Icons set). */
export function SendActionsIcon({ className, size = 24 }: SendActionsIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2S2 6.477 2 12s4.477 10 10 10Z" />
        <path d="m9 7.5l8 4.5l-8 4.5z" />
      </g>
    </svg>
  )
}