import { describe, expect, it } from "vitest";

import { isSupabaseSyncConfigured, resolveSupabaseServerConfig } from "./config";

describe("supabase config", () => {
  it("returns null when env is incomplete", () => {
    expect(
      resolveSupabaseServerConfig({
        SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toBeNull();
    expect(isSupabaseSyncConfigured({})).toBe(false);
  });

  it("resolves server config when url and service role are set", () => {
    const config = resolveSupabaseServerConfig({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });

    expect(config).toEqual({
      url: "https://example.supabase.co",
      serviceRoleKey: "service-role-key",
    });
    expect(isSupabaseSyncConfigured({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    })).toBe(true);
  });
});