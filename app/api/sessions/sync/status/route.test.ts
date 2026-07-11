import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("GET /api/sessions/sync/status", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it("reports disabled when Supabase env is missing", async () => {
    process.env = { ...originalEnv };
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const response = await GET();
    const payload = await response.json();

    expect(payload.data.enabled).toBe(false);
  });

  it("reports enabled when Supabase env is configured", async () => {
    process.env = {
      ...originalEnv,
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
    };
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await GET();
    const payload = await response.json();

    expect(payload.data.enabled).toBe(true);
    expect(payload.data.authRequired).toBe(true);
    expect(payload.data.authConfigured).toBe(false);
  });

  it("reports auth configured when anon key is present", async () => {
    process.env = {
      ...originalEnv,
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    };

    const response = await GET();
    const payload = await response.json();

    expect(payload.data.authConfigured).toBe(true);
  });
});