"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const liquidMetalButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-md font-medium tracking-tight text-primary-foreground transition-[transform,box-shadow] duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:z-10 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
)

interface LiquidMetalButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof liquidMetalButtonVariants> {
  asChild?: boolean
}

function LiquidMetalButton({
  className,
  size,
  asChild = false,
  children,
  ...props
}: LiquidMetalButtonProps) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="liquid-metal-button"
      className={cn(
        liquidMetalButtonVariants({ size }),
        "shader-liquid-metal shader-sheen text-background shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_2px_12px_-2px_rgba(0,0,0,0.5)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_6px_20px_-4px_rgba(0,0,0,0.6)]",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-background/10 to-background/40" />
      <span className="relative z-10 inline-flex items-center gap-2 mix-blend-plus-lighter">
        {children}
      </span>
    </Comp>
  )
}

export { LiquidMetalButton, liquidMetalButtonVariants }
