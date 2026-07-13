import { Logger } from "@/lib/logger"

const DB_NAME = "JarvisComponentLibrary"
const DB_VERSION = 1
const STORE_NAME = "components"
const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2"
const MAX_HTML_CHARS_FOR_EMBED = 2_000
const MAX_HTML_CHARS_FOR_FEW_SHOT = 3_500

export type ComponentLibraryEntry = {
  id: string
  buildHistoryId: string
  userPrompt: string
  html: string
  embedding: number[]
  pinnedAt: string
}

export type PinComponentInput = {
  buildHistoryId: string
  userPrompt: string
  html: string
}

export type EmbedFn = (text: string) => Promise<number[]>

let dbPromise: Promise<IDBDatabase> | null = null
let embedPipelinePromise: Promise<EmbedFn> | null = null
let embedFnOverride: EmbedFn | null = null

function isIndexedDbAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined"
}

function openDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error("IndexedDB is not available"))
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onerror = () => reject(request.error ?? new Error("Failed to open component library"))
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
          store.createIndex("buildHistoryId", "buildHistoryId", { unique: true })
          store.createIndex("pinnedAt", "pinnedAt", { unique: false })
        }
      }
    })
  }

  return dbPromise
}

export function resetComponentLibraryForTests(): void {
  dbPromise = null
  embedPipelinePromise = null
  embedFnOverride = null
}

/** Test-only: inject deterministic embedder (skip downloading MiniLM). */
export function setEmbedFnForTests(fn: EmbedFn | null): void {
  embedFnOverride = fn
  embedPipelinePromise = null
}

function buildEmbedText(prompt: string, html: string): string {
  const clippedHtml = html.trim().slice(0, MAX_HTML_CHARS_FOR_EMBED)
  return `${prompt.trim()}\n\n${clippedHtml}`
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i] ?? 0
    const right = b[i] ?? 0
    dot += left * right
    normA += left * left
    normB += right * right
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function getDefaultEmbedFn(): Promise<EmbedFn> {
  if (embedFnOverride) return embedFnOverride

  // Vitest / SSR: never download the MiniLM model; callers treat this as empty RAG.
  if (typeof window === "undefined" || process.env.VITEST) {
    throw new Error("Local embedding model unavailable in this environment")
  }

  if (!embedPipelinePromise) {
    embedPipelinePromise = (async () => {
      const { pipeline, env } = await import("@xenova/transformers")
      // Prefer local cache; allow CDN download on first use in the browser.
      env.allowLocalModels = false
      const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL)
      return async (text: string) => {
        const output = await extractor(text, { pooling: "mean", normalize: true })
        return Array.from(output.data as Float32Array)
      }
    })().catch((error) => {
      embedPipelinePromise = null
      Logger.warn("Failed to load local embedding model", { error: String(error) })
      throw error
    })
  }

  return embedPipelinePromise
}

export async function embedText(text: string): Promise<number[]> {
  const embed = await getDefaultEmbedFn()
  return embed(text)
}

export async function listPinnedComponents(): Promise<ComponentLibraryEntry[]> {
  if (!isIndexedDbAvailable()) return []

  try {
    const db = await openDatabase()
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll()
      request.onerror = () => reject(request.error ?? new Error("Failed to list pinned components"))
      request.onsuccess = () => resolve((request.result as ComponentLibraryEntry[]) ?? [])
    })
  } catch (error) {
    Logger.warn("Failed to list pinned components", { error: String(error) })
    return []
  }
}

export async function isComponentPinned(buildHistoryId: string): Promise<boolean> {
  const pinned = await listPinnedComponents()
  return pinned.some((entry) => entry.buildHistoryId === buildHistoryId)
}

export async function listPinnedBuildHistoryIds(): Promise<string[]> {
  const pinned = await listPinnedComponents()
  return pinned.map((entry) => entry.buildHistoryId)
}

export async function pinComponent(input: PinComponentInput): Promise<ComponentLibraryEntry | null> {
  if (!isIndexedDbAvailable()) return null
  if (!input.html.trim()) return null

  try {
    const embedding = await embedText(buildEmbedText(input.userPrompt, input.html))
    const entry: ComponentLibraryEntry = {
      id: `comp-${input.buildHistoryId}`,
      buildHistoryId: input.buildHistoryId,
      userPrompt: input.userPrompt.trim(),
      html: input.html,
      embedding,
      pinnedAt: new Date().toISOString(),
    }

    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(entry)
      request.onerror = () => reject(request.error ?? new Error("Failed to pin component"))
      request.onsuccess = () => resolve()
    })

    return entry
  } catch (error) {
    Logger.warn("Failed to pin component", { error: String(error) })
    return null
  }
}

export async function unpinComponent(buildHistoryId: string): Promise<boolean> {
  if (!isIndexedDbAvailable()) return false

  try {
    const db = await openDatabase()
    const existing = await new Promise<ComponentLibraryEntry | null>((resolve, reject) => {
      const index = db
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .index("buildHistoryId")
      const request = index.get(buildHistoryId)
      request.onerror = () => reject(request.error ?? new Error("Failed to find pinned component"))
      request.onsuccess = () => resolve((request.result as ComponentLibraryEntry | undefined) ?? null)
    })

    if (!existing) return false

    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(existing.id)
      request.onerror = () => reject(request.error ?? new Error("Failed to unpin component"))
      request.onsuccess = () => resolve()
    })

    return true
  } catch (error) {
    Logger.warn("Failed to unpin component", { error: String(error) })
    return false
  }
}

export async function clearPinnedComponents(): Promise<void> {
  if (!isIndexedDbAvailable()) return
  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).clear()
      request.onerror = () => reject(request.error ?? new Error("Failed to clear component library"))
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    Logger.warn("Failed to clear component library", { error: String(error) })
  }
}

export async function retrieveTopK(
  prompt: string,
  k = 3,
): Promise<Array<ComponentLibraryEntry & { score: number }>> {
  const pinned = await listPinnedComponents()
  if (pinned.length === 0 || !prompt.trim()) return []

  try {
    const queryEmbedding = await embedText(prompt.trim())
    return pinned
      .map((entry) => ({
        ...entry,
        score: cosineSimilarity(queryEmbedding, entry.embedding),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, Math.max(1, k))
  } catch (error) {
    Logger.warn("Failed to retrieve similar components", { error: String(error) })
    return []
  }
}

export function formatFewShotExamples(
  examples: Array<Pick<ComponentLibraryEntry, "userPrompt" | "html">>,
): string {
  if (examples.length === 0) return ""

  const blocks = examples.map((example, index) => {
    const html = example.html.slice(0, MAX_HTML_CHARS_FOR_FEW_SHOT)
    return [
      `### Example ${index + 1}`,
      `Prompt: ${example.userPrompt}`,
      "```html",
      html,
      "```",
    ].join("\n")
  })

  return [
    "## Local component library (few-shot)",
    "Use these previously pinned successful builds as style/structure references. Adapt — do not copy blindly.",
    ...blocks,
  ].join("\n\n")
}
