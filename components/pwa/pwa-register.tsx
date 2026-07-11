"use client"

import { useEffect } from "react"

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" })
      } catch {
        /* SW optional in dev / unsupported browsers */
      }
    }

    if (document.readyState === "complete") {
      void register()
    } else {
      window.addEventListener("load", () => void register(), { once: true })
    }
  }, [])

  return null
}