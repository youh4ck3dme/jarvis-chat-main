import { validateJarvisHtmlArtifact } from "@/copied-from-visual-html/lib/jarvis-artifacts"
import type { BuildEvaluation } from "@/types/build"

export const REFINE_SCORE_THRESHOLD = 0.7

const SCORE_WEIGHTS = {
  document: 0.15,
  closingHtml: 0.25,
  css: 0.15,
  script: 0.25,
  anchorIds: 0.1,
  sections: 0.1,
} as const

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function countSections(html: string): number {
  const lower = html.toLowerCase()
  const structuralTags = (lower.match(/<(section|main|article|header|footer)\b/g) ?? []).length
  const idCount = (lower.match(/\bid="/g) ?? []).length
  return Math.max(structuralTags, idCount >= 2 ? Math.min(idCount, 4) : 0)
}

function computeArtifactScore(html: string): number {
  const lower = html.toLowerCase()
  let score = 0

  if (lower.includes("<!doctype html") || lower.includes("<html")) {
    score += SCORE_WEIGHTS.document
  }
  if (lower.includes("</html>")) {
    score += SCORE_WEIGHTS.closingHtml
  }
  if (lower.includes("<style") || lower.includes(" style=")) {
    score += SCORE_WEIGHTS.css
  }
  if (lower.includes("<script")) {
    score += SCORE_WEIGHTS.script
  }
  if (!(html.includes('href="#') && !lower.includes('id="'))) {
    score += SCORE_WEIGHTS.anchorIds
  }
  if (countSections(html) >= 2) {
    score += SCORE_WEIGHTS.sections
  }

  return clampScore(score)
}

export function evaluateBuildArtifact(html: string | null): BuildEvaluation {
  const validation = validateJarvisHtmlArtifact(html)

  if (!html?.trim()) {
    return {
      ok: false,
      score: 0,
      issues: validation.issues,
      shouldRefine: true,
    }
  }

  const lower = html.toLowerCase()
  const hasClosingHtml = lower.includes("</html>")
  const hasScript = lower.includes("<script")
  const score = computeArtifactScore(html)
  const shouldRefine = !hasClosingHtml || !hasScript || score < REFINE_SCORE_THRESHOLD

  return {
    ok: validation.ok,
    score,
    issues: validation.issues,
    shouldRefine,
  }
}