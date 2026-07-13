import type {
  PreviewConsoleEntry,
  PreviewErrorEntry,
  PreviewNetworkEntry,
} from "@/copied-from-visual-html/lib/preview-console-bridge"

export const MAX_SELF_HEAL_ATTEMPTS = 3

export type SelfHealIssueKind = "runtime-error" | "console-error" | "csp-violation" | "network-error"

export type SelfHealIssue = {
  id: string
  kind: SelfHealIssueKind
  message: string
  source?: string
  lineno?: number
  colno?: number
  stack?: string
  url?: string
  status?: number
}

export function isCspViolationMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes("content security policy") ||
    normalized.includes("csp violation") ||
    normalized.includes("refused to execute") ||
    normalized.includes("refused to load") ||
    normalized.includes("violates the following content security policy")
  )
}

export function selfHealIssueFromError(entry: PreviewErrorEntry): SelfHealIssue {
  return {
    id: entry.id,
    kind: "runtime-error",
    message: entry.message,
    source: entry.source,
    lineno: entry.lineno,
    colno: entry.colno,
    stack: entry.stack,
  }
}

export function selfHealIssueFromConsole(entry: PreviewConsoleEntry): SelfHealIssue | null {
  const message = entry.args.join(" ").trim()
  if (!message) return null

  if (entry.level === "error") {
    return {
      id: entry.id,
      kind: isCspViolationMessage(message) ? "csp-violation" : "console-error",
      message,
    }
  }

  if (entry.level === "warn" && isCspViolationMessage(message)) {
    return {
      id: entry.id,
      kind: "csp-violation",
      message,
    }
  }

  return null
}

export function selfHealIssueFromNetwork(entry: PreviewNetworkEntry): SelfHealIssue | null {
  if (entry.error) {
    return {
      id: entry.id,
      kind: "network-error",
      message: entry.error,
      url: entry.url,
    }
  }

  if (entry.status != null && entry.status >= 400) {
    return {
      id: entry.id,
      kind: "network-error",
      message: `HTTP ${entry.status} for ${entry.method} ${entry.url}`,
      url: entry.url,
      status: entry.status,
    }
  }

  return null
}

export function extractRelevantHtmlSlice(html: string, issue: SelfHealIssue, maxChars = 4000): string {
  const trimmed = html.trim()
  if (!trimmed) return ""

  if (issue.lineno != null && issue.lineno > 0) {
    const lines = trimmed.split("\n")
    const index = Math.max(0, issue.lineno - 1)
    const start = Math.max(0, index - 12)
    const end = Math.min(lines.length, index + 12)
    return lines.slice(start, end).join("\n").slice(0, maxChars)
  }

  const scriptMatch = trimmed.match(/<script[\s\S]*?<\/script>/i)
  if (scriptMatch) {
    return scriptMatch[0].slice(0, maxChars)
  }

  if (issue.kind === "csp-violation") {
    const headSlice = trimmed.match(/<head[\s\S]*?<\/head>/i)
    if (headSlice) return headSlice[0].slice(0, maxChars)
  }

  return trimmed.slice(0, maxChars)
}

export function buildSelfHealPrompt(issue: SelfHealIssue, html: string): string {
  const slice = extractRelevantHtmlSlice(html, issue)
  const location =
    issue.source && issue.lineno != null
      ? `${issue.source}:${issue.lineno}${issue.colno != null ? `:${issue.colno}` : ""}`
      : issue.url ?? "sandbox preview"

  const lines = [
    "Oprav aktuálny HTML artefakt v preview. Runtime inspector zachytil chybu — vráť kompletný opravený HTML dokument v jednom ```html bloku.",
    "",
    `Typ: ${issue.kind}`,
    `Správa: ${issue.message}`,
    `Umiestnenie: ${location}`,
  ]

  if (issue.stack) {
    lines.push("", "Stack:", issue.stack)
  }

  if (slice) {
    lines.push("", "Relevantný HTML výrez:", "```html", slice, "```")
  }

  lines.push(
    "",
    "Požiadavky:",
    "- Zachovaj existujúci dizajn a copy, oprav len príčinu chyby.",
    "- Výstup musí byť validný kompletný HTML dokument so </html>.",
    "- Inline skripty musia byť kompatibilné so sandbox preview (žiadne externé skripty).",
  )

  return lines.join("\n")
}

export function formatSelfHealAttemptLabel(attempt: number, max = MAX_SELF_HEAL_ATTEMPTS): string {
  return `Self-heal attempt ${attempt}/${max}`
}

export function canRequestSelfHeal(attemptCount: number, max = MAX_SELF_HEAL_ATTEMPTS): boolean {
  return attemptCount < max
}
