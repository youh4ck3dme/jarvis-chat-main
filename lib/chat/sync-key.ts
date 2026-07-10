export const JARVIS_SYNC_KEY_STORAGE = "jarvis-sync-key";

export function generateSyncKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getOrCreateSyncKey(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(JARVIS_SYNC_KEY_STORAGE)?.trim();
  if (existing) return existing;
  const created = generateSyncKey();
  window.localStorage.setItem(JARVIS_SYNC_KEY_STORAGE, created);
  return created;
}

export function readSyncKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(JARVIS_SYNC_KEY_STORAGE)?.trim() || null;
}