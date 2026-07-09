import type { BuildEvaluation } from "@/types/build"

export const BUILD_EXPERIENCE_STORAGE_KEY = "jarvis-build-experience"
export const BUILD_EXPERIENCE_MAX_ENTRIES = 10
export const SCRIPT_ISSUE_THRESHOLD = 0.5

export type BuildExperienceEntry = {
  recordedAt: string
  evaluation: BuildEvaluation
}

const SCRIPT_ISSUE_MARKERS = ["<script>", "script"]

export function isScriptIssue(issues: string[]): boolean {
  return issues.some((issue) =>
    SCRIPT_ISSUE_MARKERS.some((marker) => issue.toLowerCase().includes(marker.toLowerCase())),
  )
}

export function hasFrequentScriptIssues(entries: BuildExperienceEntry[]): boolean {
  if (entries.length === 0) {
    return false
  }

  const scriptIssueCount = entries.filter((entry) => isScriptIssue(entry.evaluation.issues)).length
  return scriptIssueCount / entries.length > SCRIPT_ISSUE_THRESHOLD
}

export function getExperienceHint(entries: BuildExperienceEntry[]): string | null {
  if (!hasFrequentScriptIssues(entries)) {
    return null
  }

  return "Recent builds often missed inline <script>. Plan for functional JavaScript on every button, CTA, and nav interaction before closing </html>."
}

export function loadBuildExperience(): BuildExperienceEntry[] {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const raw = window.localStorage.getItem(BUILD_EXPERIENCE_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as BuildExperienceEntry[]
    return Array.isArray(parsed) ? parsed.slice(0, BUILD_EXPERIENCE_MAX_ENTRIES) : []
  } catch {
    return []
  }
}

export function recordBuildEvaluation(evaluation: BuildEvaluation): BuildExperienceEntry[] {
  if (typeof window === "undefined") {
    return []
  }

  const nextEntry: BuildExperienceEntry = {
    recordedAt: new Date().toISOString(),
    evaluation,
  }

  const updated = [nextEntry, ...loadBuildExperience()].slice(0, BUILD_EXPERIENCE_MAX_ENTRIES)

  try {
    window.localStorage.setItem(BUILD_EXPERIENCE_STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Ignore quota errors in the browser.
  }

  return updated
}

export function readExperienceHint(): string | null {
  return getExperienceHint(loadBuildExperience())
}