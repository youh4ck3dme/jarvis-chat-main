import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const selectMemoryMock = vi.fn();
const selectProfileMock = vi.fn();
const upsertMemoryMock = vi.fn();
const upsertProfileMock = vi.fn();

vi.mock("@/lib/supabase/admin-client", () => ({
  getSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table === "jarvis_conversation_memory") {
        return {
          select: () => ({
            eq: () => ({
              is: () => ({
                order: () => selectMemoryMock(),
              }),
            }),
          }),
          upsert: upsertMemoryMock,
        };
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => selectProfileMock(),
          }),
        }),
        upsert: upsertProfileMock,
      };
    },
  }),
}));

describe("/api/memory/sync", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
    };
    selectMemoryMock.mockReset();
    selectProfileMock.mockReset();
    upsertMemoryMock.mockReset();
    upsertProfileMock.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it("GET returns memory bundles for sync key", async () => {
    selectMemoryMock.mockResolvedValue({
      data: [
        {
          conversation_id: "conv-1",
          entries: [{ id: "m1", content: "fact" }],
          conversation_memory: null,
        },
      ],
      error: null,
    });
    selectProfileMock.mockResolvedValue({ data: { profile: null }, error: null });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/memory/sync?syncKey=device-1", {
        headers: { "X-Jarvis-Sync-Key": "device-1" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.conversations).toHaveLength(1);
  });

  it("POST upserts memory bundles", async () => {
    upsertMemoryMock.mockResolvedValue({ error: null });
    upsertProfileMock.mockResolvedValue({ error: null });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/memory/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Jarvis-Sync-Key": "device-1",
        },
        body: JSON.stringify({
          syncKey: "device-1",
          memory: {
            conversations: [
              {
                conversationId: "conv-1",
                entries: [],
                conversationMemory: null,
              },
            ],
            userProfile: null,
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(upsertMemoryMock).toHaveBeenCalled();
  });
});