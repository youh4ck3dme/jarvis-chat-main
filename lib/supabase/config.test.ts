import { describe, expect, it } from "vitest";

import {
  isSupabaseAuthConfigured,
  isSupabaseSyncConfigured,
  resolveSupabasePublicConfig,
  resolveSupabaseServerConfig,
} from "./config";

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

  it("resolves public auth config when anon key is set", () => {
    const config = resolveSupabasePublicConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });

    expect(config).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
    expect(
      isSupabaseAuthConfigured({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toBe(true);
  });
});