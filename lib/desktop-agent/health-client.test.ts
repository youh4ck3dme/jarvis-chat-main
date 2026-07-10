import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchDesktopAgentHealth } from "./health-client";

describe("health-client", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null if window is undefined (SSR)", async () => {
    vi.stubGlobal("window", undefined);
    const health = await fetchDesktopAgentHealth();
    expect(health).toBeNull();
  });

  it("performs health request and returns parsed payload on success", async () => {
    const mockPayload = {
      status: "ok",
      agent_version: "0.1.0",
      platform: "darwin",
      gemini_live_model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
      conversation_id: "desktop-voice-session",
      memory_sync: { enabled: true, last_sync_at: null, web_base_url: "http://127.0.0.1:3141" },
      tools_available: 17,
      uptime_sec: 120,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPayload,
    });
    vi.stubGlobal("fetch", mockFetch);

    const health = await fetchDesktopAgentHealth();
    expect(health).toEqual(mockPayload);
    expect(mockFetch).toHaveBeenCalled();
  });

  it("returns null when fetch returns error code or rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      })
    );

    const health = await fetchDesktopAgentHealth();
    expect(health).toBeNull();
  });

  it("returns null when fetch aborts on timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("The operation was aborted.", "AbortError"))
    );

    const health = await fetchDesktopAgentHealth();
    expect(health).toBeNull();
  });
});
