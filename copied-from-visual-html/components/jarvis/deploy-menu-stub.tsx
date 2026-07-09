"use client"

import { Download } from "lucide-react"

import { cn } from "@/lib/utils"

type DeployMenuStubProps = {
  html: string
  origin: "builder" | "jarvis"
  className?: string
  disabled?: boolean
}

/** Stub: originálny DeployMenu je v PandoRa-Box (TanStack Start). Tu len export HTML. */
export function DeployMenu({ html, className, disabled = false }: DeployMenuStubProps) {
  const handleDownload = () => {
    if (!html || disabled) return
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "jarvis-output.html"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={disabled}
      title="Export HTML"
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white disabled:opacity-40",
        className,
      )}
    >
      <Download className="h-3.5 w-3.5" />
    </button>
  )
}