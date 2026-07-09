import { z } from "zod"

import type { BuildLanguage, BuildPlan } from "@/types/build"

export const buildPlanSchema = z.object({
  summary: z.string().trim().min(1),
  sections: z.array(z.string().trim().min(1)).min(1),
  primaryColor: z.string().trim().optional(),
  ctaLabel: z.string().trim().optional(),
  language: z.enum(["SK", "CZ", "EN"]),
  mustHaveScript: z.boolean().default(true),
})

const DEFAULT_SECTIONS = ["hero", "navigation", "about", "features", "contact", "footer"]

export function detectBuildLanguage(prompt: string): BuildLanguage {
  const sample = prompt.slice(0, 400).toLowerCase()
  const czechHints = /\b(prosím|děkuji|stránka|tlačítko|barva)\b/
  const slovakHints = /\b(prosím|ďakujem|stránka|tlačidlo|farba|vytvor|urob)\b/

  if (czechHints.test(sample) && !slovakHints.test(sample)) {
    return "CZ"
  }
  if (slovakHints.test(sample)) {
    return "SK"
  }
  return "EN"
}

export function createFallbackBuildPlan(userPrompt: string): BuildPlan {
  const language = detectBuildLanguage(userPrompt)
  const ctaByLanguage: Record<BuildLanguage, string> = {
    SK: "Začať",
    CZ: "Začít",
    EN: "Get started",
  }

  return {
    summary: userPrompt.trim().slice(0, 160) || "Single-page HTML build",
    sections: DEFAULT_SECTIONS,
    primaryColor: "#111111",
    ctaLabel: ctaByLanguage[language],
    language,
    mustHaveScript: true,
  }
}

export function formatPlanForSystemPrompt(plan: BuildPlan, experienceHint?: string | null): string {
  const lines = [
    "## Build plan",
    "Build according to this plan:",
    JSON.stringify(plan, null, 2),
    "Honor the plan sections, CTA label, primary color, and language.",
    "Deliver one complete ```html artifact with inline CSS and inline <script> for every button.",
  ]

  if (experienceHint?.trim()) {
    lines.push("", "## Experience hint", experienceHint.trim())
  }

  return lines.join("\n")
}

export function normalizeBuildPlan(raw: z.infer<typeof buildPlanSchema>): BuildPlan {
  return {
    summary: raw.summary,
    sections: raw.sections,
    primaryColor: raw.primaryColor,
    ctaLabel: raw.ctaLabel,
    language: raw.language,
    mustHaveScript: raw.mustHaveScript ?? true,
  }
}