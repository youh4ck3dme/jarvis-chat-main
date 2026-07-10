import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const selectMemoryMock = vi.fn();
const selectProfileMock = vi.fn();
const upsertMemoryMock = vi.fn();
const upsertProfileMock = vi.fn();

vi.mock("@/lib/supabase/verify-request-auth", () => ({
  verifyRequestAuth: vi.fn(async () => ({
    ok: true,
    user: { userId: "user-123", email: "test@example.com" },
  })),
}));

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
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
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

  it("GET returns memory bundles for authenticated user", async () => {
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
      new Request("http://localhost/api/memory/sync", {
        headers: { Authorization: "Bearer test-token" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.conversations).toHaveLength(1);
  });

  it("POST upserts memory bundles for authenticated user", async () => {
    upsertMemoryMock.mockResolvedValue({ error: null });
    upsertProfileMock.mockResolvedValue({ error: null });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/memory/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
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