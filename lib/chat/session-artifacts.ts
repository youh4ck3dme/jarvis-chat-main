import { extractHtmlArtifacts } from "./assistant-artifact-export"

export type SessionArtifact = {
  id: string
  slug: string
  title: string
  html: string
  createdAt: string
}

const PAGE_ANNOTATION_RE = /<!--\s*page:\s*([a-zA-Z0-9][a-zA-Z0-9_-]{0,62})\s*-->/i
const TITLE_TAG_RE = /<title[^>]*>([^<]*)<\/title>/i
const H1_TAG_RE = /<h1[^>]*>([^<]*)<\/h1>/i

export function generateArtifactId(): string {
  return `art-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function slugifyArtifactSlug(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)

  return slug || "page"
}

export function extractPageAnnotation(html: string): string | null {
  const match = html.match(PAGE_ANNOTATION_RE)
  if (!match?.[1]) return null
  return slugifyArtifactSlug(match[1])
}

export function stripPageAnnotation(html: string): string {
  return html.replace(PAGE_ANNOTATION_RE, "").trim()
}

export function deriveArtifactTitle(html: string, slug: string): string {
  const title = html.match(TITLE_TAG_RE)?.[1]?.trim()
  if (title) return title
  const heading = html.match(H1_TAG_RE)?.[1]?.replace(/<[^>]+>/g, "").trim()
  if (heading) return heading
  if (slug === "index" || slug === "home") return "Home"
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function uniqueSlug(base: string, used: Set<string>): string {
  let candidate = base
  let counter = 2
  while (used.has(candidate)) {
    candidate = `${base}-${counter}`
    counter += 1
  }
  used.add(candidate)
  return candidate
}

export function createSessionArtifact(input: {
  html: string
  slug?: string
  title?: string
  createdAt?: string
  id?: string
}): SessionArtifact {
  const createdAt = input.createdAt ?? new Date().toISOString()
  const annotatedSlug = extractPageAnnotation(input.html)
  const slug = slugifyArtifactSlug(input.slug ?? annotatedSlug ?? "index")
  const html = input.html.trim()
  return {
    id: input.id ?? generateArtifactId(),
    slug,
    title: input.title?.trim() || deriveArtifactTitle(html, slug),
    html,
    createdAt,
  }
}

/** Parse assistant content into one or more page artifacts (`<!-- page:slug -->` + multi fences). */
export function parsePageArtifactsFromContent(
  content: string,
  createdAt = new Date().toISOString(),
): SessionArtifact[] {
  const blocks = extractHtmlArtifacts(content)
  if (blocks.length === 0) return []

  const used = new Set<string>()
  return blocks.map((html, index) => {
    const annotated = extractPageAnnotation(html)
    const fallback = index === 0 ? "index" : `page-${index + 1}`
    const slug = uniqueSlug(slugifyArtifactSlug(annotated ?? fallback), used)
    return createSessionArtifact({ html, slug, createdAt })
  })
}

export function getActiveArtifact(
  artifacts: SessionArtifact[] | undefined,
  activeArtifactId: string | null | undefined,
): SessionArtifact | null {
  if (!artifacts || artifacts.length === 0) return null
  if (activeArtifactId) {
    const match = artifacts.find((artifact) => artifact.id === activeArtifactId)
    if (match) return match
  }
  return artifacts[0] ?? null
}

export function findArtifactBySlug(
  artifacts: SessionArtifact[] | undefined,
  slug: string,
): SessionArtifact | null {
  if (!artifacts?.length) return null
  const normalized = slugifyArtifactSlug(slug.replace(/\.html?$/i, ""))
  return (
    artifacts.find((artifact) => artifact.slug === normalized) ??
    (normalized === "home" || normalized === "index"
      ? artifacts.find((artifact) => artifact.slug === "index" || artifact.slug === "home") ?? null
      : null)
  )
}

export function normalizeSessionArtifacts(
  rawArtifacts: unknown,
  activeArtifactId: unknown,
  fallbackHtml?: string | null,
): { artifacts: SessionArtifact[]; activeArtifactId: string | null } {
  const artifacts: SessionArtifact[] = []

  if (Array.isArray(rawArtifacts)) {
    for (const entry of rawArtifacts) {
      if (!entry || typeof entry !== "object") continue
      const record = entry as Record<string, unknown>
      if (typeof record.html !== "string" || !record.html.trim()) continue
      const createdAt =
        typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString()
      artifacts.push(
        createSessionArtifact({
          id: typeof record.id === "string" ? record.id : undefined,
          html: record.html,
          slug: typeof record.slug === "string" ? record.slug : undefined,
          title: typeof record.title === "string" ? record.title : undefined,
          createdAt,
        }),
      )
    }
  }

  if (artifacts.length === 0 && fallbackHtml?.trim()) {
    artifacts.push(createSessionArtifact({ html: fallbackHtml, slug: "index" }))
  }

  const requestedId = typeof activeArtifactId === "string" ? activeArtifactId : null
  const resolvedId =
    requestedId && artifacts.some((artifact) => artifact.id === requestedId)
      ? requestedId
      : artifacts[0]?.id ?? null

  return { artifacts, activeArtifactId: resolvedId }
}
