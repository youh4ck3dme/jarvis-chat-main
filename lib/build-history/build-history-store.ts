import { Logger } from "@/lib/logger"

import type { BuildEvaluation, BuildTrace } from "@/types/build"

const DB_NAME = "JarvisBuildHistory"
const DB_VERSION = 3
const STORE_NAME = "builds"
const MAX_RECORDS_PER_SESSION = 50

export type BuildHistoryRecord = {
  id: string
  sessionId?: string
  createdAt: string
  userPrompt: string
  evaluation: BuildEvaluation
  trace: BuildTrace
  htmlChars: number
  planSummary?: string
  /** Full HTML artifact for restore + A/B compare (optional for legacy rows). */
  html?: string
  /** jpeg/png data URL thumbnail captured after build. */
  thumbnailDataUrl?: string
}

export type SaveBuildHistoryInput = {
  sessionId?: string
  userPrompt: string
  evaluation: BuildEvaluation
  trace: BuildTrace
  htmlChars: number
  planSummary?: string
  html?: string
  thumbnailDataUrl?: string
  /** Optional deterministic timestamp for tests. */
  createdAt?: string
}

export type ListBuildHistoryOptions = {
  sessionId?: string
  limit?: number
}

let dbPromise: Promise<IDBDatabase> | null = null

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

      request.onerror = () => reject(request.error ?? new Error("Failed to open build history database"))
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
          store.createIndex("createdAt", "createdAt", { unique: false })
          store.createIndex("sessionId", "sessionId", { unique: false })
        } else {
          const transaction = request.transaction
          const store = transaction?.objectStore(STORE_NAME)
          if (store && !store.indexNames.contains("sessionId")) {
            store.createIndex("sessionId", "sessionId", { unique: false })
          }
        }
      }
    })
  }

  return dbPromise
}

function createRecordId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createBuildHistoryRecord(input: SaveBuildHistoryInput): BuildHistoryRecord {
  return {
    id: createRecordId(),
    sessionId: input.sessionId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    userPrompt: input.userPrompt.trim(),
    evaluation: input.evaluation,
    trace: input.trace,
    htmlChars: input.htmlChars,
    planSummary: input.planSummary,
    html: input.html,
    thumbnailDataUrl: input.thumbnailDataUrl,
  }
}

function matchesSessionFilter(record: BuildHistoryRecord, sessionId?: string): boolean {
  if (!sessionId) return true
  return record.sessionId === sessionId
}

export async function saveBuildHistory(input: SaveBuildHistoryInput): Promise<BuildHistoryRecord | null> {
  if (!isIndexedDbAvailable()) {
    return null
  }

  const record = createBuildHistoryRecord(input)

  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(record)

      request.onerror = () => reject(request.error ?? new Error("Failed to save build history"))
      request.onsuccess = () => resolve()
    })

    await trimBuildHistoryForSession(input.sessionId, MAX_RECORDS_PER_SESSION)
    return record
  } catch (error) {
    Logger.warn("Failed to save build history", { error: String(error) })
    return null
  }
}

export async function getBuildHistoryRecord(id: string): Promise<BuildHistoryRecord | null> {
  if (!isIndexedDbAvailable()) {
    return null
  }

  try {
    const db = await openDatabase()
    return await new Promise<BuildHistoryRecord | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly")
      const request = transaction.objectStore(STORE_NAME).get(id)
      request.onerror = () => reject(request.error ?? new Error("Failed to read build history record"))
      request.onsuccess = () => resolve((request.result as BuildHistoryRecord | undefined) ?? null)
    })
  } catch (error) {
    Logger.warn("Failed to get build history record", { error: String(error) })
    return null
  }
}

export async function listBuildHistory(
  options: ListBuildHistoryOptions | number = {},
  legacyLimit?: number,
): Promise<BuildHistoryRecord[]> {
  if (!isIndexedDbAvailable()) {
    return []
  }

  const normalizedOptions: ListBuildHistoryOptions =
    typeof options === "number" ? { limit: options } : options
  const limit = normalizedOptions.limit ?? legacyLimit ?? 20
  const sessionId = normalizedOptions.sessionId

  try {
    const db = await openDatabase()
    const records = await new Promise<BuildHistoryRecord[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly")
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index("createdAt")
      const request = index.openCursor(null, "prev")
      const collected: BuildHistoryRecord[] = []

      request.onerror = () => reject(request.error ?? new Error("Failed to read build history"))
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor || collected.length >= limit) {
          resolve(collected)
          return
        }

        const record = cursor.value as BuildHistoryRecord
        if (matchesSessionFilter(record, sessionId)) {
          collected.push(record)
        }
        cursor.continue()
      }
    })

    return records
  } catch (error) {
    Logger.warn("Failed to list build history", { error: String(error) })
    return []
  }
}

export async function countBuildHistory(sessionId?: string): Promise<number> {
  if (!isIndexedDbAvailable()) {
    return 0
  }

  try {
    const db = await openDatabase()
    const count = await new Promise<number>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onerror = () => reject(request.error ?? new Error("Failed to count build history"))
      request.onsuccess = () => {
        const records = request.result as BuildHistoryRecord[]
        resolve(records.filter((record) => matchesSessionFilter(record, sessionId)).length)
      }
    })

    return count
  } catch (error) {
    Logger.warn("Failed to count build history", { error: String(error) })
    return 0
  }
}

async function trimBuildHistoryForSession(sessionId: string | undefined, maxRecords: number): Promise<void> {
  const db = await openDatabase()
  const allRecords = await new Promise<BuildHistoryRecord[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onerror = () => reject(request.error ?? new Error("Failed to count build history"))
    request.onsuccess = () => resolve(request.result as BuildHistoryRecord[])
  })

  const scopedRecords = allRecords.filter((record) => matchesSessionFilter(record, sessionId))
  if (scopedRecords.length <= maxRecords) {
    return
  }

  const sorted = [...scopedRecords].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  const staleRecords = sorted.slice(maxRecords)

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    for (const record of staleRecords) {
      store.delete(record.id)
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error("Failed to trim build history"))
  })
}

/** Test-only reset for cached IndexedDB connection between Vitest cases. */
export function resetBuildHistoryStoreForTests(): void {
  dbPromise = null
}

export async function clearBuildHistory(): Promise<void> {
  if (!isIndexedDbAvailable()) {
    return
  }

  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite")
      const request = transaction.objectStore(STORE_NAME).clear()

      request.onerror = () => reject(request.error ?? new Error("Failed to clear build history"))
      request.onsuccess = () => resolve()
    })
  } catch (error) {
    Logger.warn("Failed to clear build history", { error: String(error) })
  }
}

export async function clearBuildHistoryForSession(sessionId: string): Promise<void> {
  if (!isIndexedDbAvailable()) {
    return
  }

  try {
    const db = await openDatabase()
    const records = await new Promise<BuildHistoryRecord[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly")
      const request = transaction.objectStore(STORE_NAME).getAll()

      request.onerror = () => reject(request.error ?? new Error("Failed to read build history"))
      request.onsuccess = () => resolve(request.result as BuildHistoryRecord[])
    })

    const staleRecords = records.filter((record) => record.sessionId === sessionId)
    if (staleRecords.length === 0) {
      return
    }

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite")
      const store = transaction.objectStore(STORE_NAME)

      for (const record of staleRecords) {
        store.delete(record.id)
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Failed to clear session build history"))
    })
  } catch (error) {
    Logger.warn("Failed to clear session build history", { error: String(error) })
  }
}
