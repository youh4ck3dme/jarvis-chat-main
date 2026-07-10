import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upsertMock = vi.fn();
const updateMock = vi.fn();
const selectMock = vi.fn();

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
    };
    upsertMock.mockReset();
    updateMock.mockReset();
    selectMock.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it("GET returns remote sessions for sync key", async () => {
    selectMock.mockResolvedValue({
      data: [
        {
          session_id: "s1",
          sync_key: "device-1",
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
      new Request("http://localhost/api/sessions/sync?syncKey=device-1", {
        headers: { "X-Jarvis-Sync-Key": "device-1" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.sessions).toHaveLength(1);
    expect(payload.data.sessions[0].id).toBe("s1");
  });

  it("POST upserts sessions for sync key", async () => {
    upsertMock.mockResolvedValue({ error: null });
    updateMock.mockResolvedValue({ error: null });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/sessions/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Jarvis-Sync-Key": "device-1",
        },
        body: JSON.stringify({
          syncKey: "device-1",
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