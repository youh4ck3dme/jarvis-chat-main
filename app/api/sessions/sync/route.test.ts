import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upsertMock = vi.fn();
const updateMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/lib/supabase/verify-request-auth", () => ({
  verifyRequestAuth: vi.fn(async () => ({
    ok: true,
    user: { userId: "user-123", email: "test@example.com" },
  })),
}));

vi.mock("@/lib/supabase/admin-client", () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            order: () => selectMock(),
          }),
        }),
      }),
      upsert: upsertMock,
      update: () => ({
        eq: () => ({
          in: () => updateMock(),
        }),
      }),
    }),
  }),
}));

describe("/api/sessions/sync", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    };
    upsertMock.mockReset();
    updateMock.mockReset();
    selectMock.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it("GET returns remote sessions for authenticated user", async () => {
    selectMock.mockResolvedValue({
      data: [
        {
          session_id: "s1",
          sync_key: "user-123",
          title: "Test",
          project_name: "Jarvis",
          messages: [],
          updated_at: "2026-07-10T12:00:00.000Z",
          deleted_at: null,
        },
      ],
      error: null,
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/sessions/sync", {
        headers: { Authorization: "Bearer test-token" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.sessions).toHaveLength(1);
    expect(payload.data.sessions[0].id).toBe("s1");
  });

  it("POST upserts sessions for authenticated user", async () => {
    upsertMock.mockResolvedValue({ error: null });
    updateMock.mockResolvedValue({ error: null });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/sessions/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          sessions: [
            {
              id: "s1",
              title: "Test",
              messages: [],
              projectName: "Jarvis",
              updatedAt: "2026-07-10T12:00:00.000Z",
            },
          ],
          deletedSessionIds: ["old-1"],
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.synced).toBe(1);
    expect(upsertMock).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalled();
  });
});