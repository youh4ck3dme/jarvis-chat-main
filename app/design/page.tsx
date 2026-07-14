import type { Metadata } from "next"

import { DesignShowcase } from "@/components/design/design-showcase"

export const metadata: Metadata = {
  title: "Shader Button Design System — Jarvis",
  description:
    "Live showcase of the Shader Button design system: OKLch tokens, Geist typography, and shader-driven controls.",
}

export default function DesignPage() {
  return <DesignShowcase />
}
