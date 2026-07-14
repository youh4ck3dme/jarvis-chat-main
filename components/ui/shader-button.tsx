"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const shaderButtonVariants = cva(
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-md font-medium tracking-tight transition-[transform,box-shadow] duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:z-10 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Flowing gradient fill using chart tokens
        flow: "text-background",
        // Transparent with an animated gradient ring
        outline: "bg-background text-foreground",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "flow",
      size: "default",
    },
  },
)

interface ShaderButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof shaderButtonVariants> {
  asChild?: boolean
}

function ShaderButton({
  className,
  variant = "flow",
  size,
  asChild = false,
  children,
  ...props
}: ShaderButtonProps) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="shader-button"
      className={cn(shaderButtonVariants({ variant, size }), className)}
      {...props}
    >
      {variant === "flow" ? (
        <span className="shader-flow-surface pointer-events-none absolute inset-0 rounded-[inherit]" />
      ) : (
        <>
          {/* animated gradient border */}
          <span className="shader-flow-surface pointer-events-none absolute inset-0 rounded-[inherit] p-px [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask-composite:exclude]" />
          <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-background" />
        </>
      )}
      {/* hover glow */}
      <span className="shader-flow-surface pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-60" />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </Comp>
  )
}

export { ShaderButton, shaderButtonVariants }
