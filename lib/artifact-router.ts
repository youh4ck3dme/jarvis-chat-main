import { findArtifactBySlug, slugifyArtifactSlug, type SessionArtifact } from "@/lib/chat/session-artifacts"

export const ARTIFACT_NAVIGATE_MESSAGE_TYPE = "pngto-preview-artifact-navigate" as const

export type ArtifactNavigatePayload = {
  type: typeof ARTIFACT_NAVIGATE_MESSAGE_TYPE
  href: string
  slug: string
  ts: number
}

export type ArtifactNavigateEntry = {
  id: string
  href: string
  slug: string
  ts: number
}

/** Relative in-site links that should switch preview tabs instead of navigating away. */
export function isInternalArtifactHref(href: string): boolean {
  const trimmed = href.trim()
  if (!trimmed) return false
  if (trimmed.startsWith("#")) return false
  if (trimmed.startsWith("mailto:") || trimmed.startsWith("tel:") || trimmed.startsWith("javascript:")) {
    return false
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false
  if (trimmed.startsWith("//")) return false
  return true
}

export function extractSlugCandidateFromHref(href: string): string | null {
  if (!isInternalArtifactHref(href)) return null

  const withoutHash = href.trim().split("#")[0]?.split("?")[0] ?? ""
  if (!withoutHash || withoutHash === "." || withoutHash === "./") {
    return "index"
  }

  const file = withoutHash
    .replace(/^\.\//, "")
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean)
    .pop()

  if (!file) return "index"
  if (file === "." || file === "..") return null

  const base = file.replace(/\.html?$/i, "")
  if (!base || base === "index" || base === "home") return "index"
  return slugifyArtifactSlug(base)
}

export function resolveArtifactFromHref(
  href: string,
  artifacts: SessionArtifact[] | undefined,
): SessionArtifact | null {
  const slug = extractSlugCandidateFromHref(href)
  if (!slug) return null
  return findArtifactBySlug(artifacts, slug)
}

export function parseArtifactNavigateMessage(data: unknown): ArtifactNavigateEntry | null {
  if (!data || typeof data !== "object") return null
  const msg = data as Record<string, unknown>
  if (msg.type !== ARTIFACT_NAVIGATE_MESSAGE_TYPE) return null
  if (typeof msg.href !== "string" || typeof msg.slug !== "string") return null
  const ts = typeof msg.ts === "number" ? msg.ts : Date.now()
  return {
    id: `${ts}-${Math.random().toString(36).slice(2, 8)}`,
    href: msg.href,
    slug: slugifyArtifactSlug(msg.slug),
    ts,
  }
}

export function normalizeArtifactNavigateMessage(data: unknown): ArtifactNavigateEntry | null {
  return parseArtifactNavigateMessage(data)
}
