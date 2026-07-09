import { afterEach, describe, expect, it } from "vitest";

import { saveExtractedMemory } from "@/lib/memory/extractor";
import { getMemoryStore } from "@/lib/memory/memory-store";

import {
  getSessionMemorySummaries,
  getSessionMemorySummary,
  sumSessionMemoryCounts,
  truncateMemoryPreview,
} from "./session-memory-summary";

describe("session-memory-summary", () => {
  afterEach(async () => {
    const store = getMemoryStore();
    await store.deleteByConversation("session-a");
    await store.deleteByConversation("session-b");
  });

  it("truncates long preview snippets", () => {
    const preview = truncateMemoryPreview("A".repeat(120));
    expect(preview.endsWith("…")).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(73);
  });

  it("returns memory count and preview for a conversation", async () => {
    await saveExtractedMemory("session-a", {
      facts: ["Používateľ má rád kávu"],
      preferences: ["Preferuje tmavý režim"],
      userInfo: [],
      questions: [],
      entities: { people: [], places: [], organizations: [], dates: [] },
      summary: "",
    });

    const summary = await getSessionMemorySummary("session-a");

    expect(summary.memoryCount).toBeGreaterThan(0);
    expect(summary.previewSnippet).toBeTruthy();
    expect(summary.lastUpdated).toBeInstanceOf(Date);
  });

  it("lists summaries per session with active flag and totals", async () => {
    await saveExtractedMemory("session-a", {
      facts: ["Fakt A"],
      preferences: [],
      userInfo: [],
      questions: [],
      entities: { people: [], places: [], organizations: [], dates: [] },
      summary: "",
    });

    const items = await getSessionMemorySummaries(
      [
        { id: "session-a", title: "Káva chat" },
        { id: "session-b", title: "Prázdna" },
      ],
      "session-b",
    );

    expect(items).toHaveLength(2);
    expect(items.find((item) => item.conversationId === "session-a")?.memoryCount).toBeGreaterThan(0);
    expect(items.find((item) => item.conversationId === "session-b")?.memoryCount).toBe(0);
    expect(items.find((item) => item.conversationId === "session-b")?.isActive).toBe(true);
    expect(sumSessionMemoryCounts(items)).toBeGreaterThan(0);
  });
});