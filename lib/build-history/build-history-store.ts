import type { BuildEvaluation, BuildTrace } from "@/types/build"

const DB_NAME = "JarvisBuildHistory"
const DB_VERSION = 1
const STORE_NAME = "builds"
const MAX_RECORDS = 50

export type BuildHistoryRecord = {
  id: string
  createdAt: string
  userPrompt: string
  evaluation: BuildEvaluation
  trace: BuildTrace
  htmlChars: number
  planSummary?: string
}

export type SaveBuildHistoryInput = {
  userPrompt: string
  evaluation: BuildEvaluation
  trace: BuildTrace
  htmlChars: number
  planSummary?: string
  /** Optional deterministic timestamp for tests. */
  createdAt?: string
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
    createdAt: input.createdAt ?? new Date().toISOString(),
    userPrompt: input.userPrompt.trim(),
    evaluation: input.evaluation,
    trace: input.trace,
    htmlChars: input.htmlChars,
    planSummary: input.planSummary,
  }
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

    await trimBuildHistory(MAX_RECORDS)
    return record
  } catch (error) {
    console.warn("Failed to save build history:", error)
    return null
  }
}

export async function listBuildHistory(limit = 20): Promise<BuildHistoryRecord[]> {
  if (!isIndexedDbAvailable()) {
    return []
  }

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

        collected.push(cursor.value as BuildHistoryRecord)
        cursor.continue()
      }
    })

    return records
  } catch (error) {
    console.warn("Failed to list build history:", error)
    return []
  }
}

async function trimBuildHistory(maxRecords: number): Promise<void> {
  const db = await openDatabase()
  const allRecords = await new Promise<BuildHistoryRecord[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly")
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index("createdAt")
    const request = index.getAll()

    request.onerror = () => reject(request.error ?? new Error("Failed to count build history"))
    request.onsuccess = () => resolve(request.result as BuildHistoryRecord[])
  })

  if (allRecords.length <= maxRecords) {
    return
  }

  const sorted = [...allRecords].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
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
    console.warn("Failed to clear build history:", error)
  }
}