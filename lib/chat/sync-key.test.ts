import { afterEach, describe, expect, it } from "vitest";

import { getOrCreateSyncKey, JARVIS_SYNC_KEY_STORAGE, readSyncKey } from "./sync-key";

describe("sync-key", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("creates and reuses a stable sync key", () => {
    expect(readSyncKey()).toBeNull();
    const first = getOrCreateSyncKey();
    const second = getOrCreateSyncKey();
    expect(first).toBe(second);
    expect(localStorage.getItem(JARVIS_SYNC_KEY_STORAGE)).toBe(first);
  });
});