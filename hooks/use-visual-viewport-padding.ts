"use client"

import { useEffect, useState } from "react"

/** Keeps fixed footers above the iOS software keyboard (Safari + PWA). */
export function useVisualViewportPadding(): number {
  const [padding, setPadding] = useState(0)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const update = () => {
      const keyboardInset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      setPadding(Math.round(keyboardInset))
    }

    update()
    viewport.addEventListener("resize", update)
    viewport.addEventListener("scroll", update)
    window.addEventListener("orientationchange", update)

    return () => {
      viewport.removeEventListener("resize", update)
      viewport.removeEventListener("scroll", update)
      window.removeEventListener("orientationchange", update)
    }
  }, [])

  return padding
}