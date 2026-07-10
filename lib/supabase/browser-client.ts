import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { resolveSupabasePublicConfig } from "./config";

let cachedClient: SupabaseClient | null | undefined;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const config = resolveSupabasePublicConfig();
  if (!config) {
    cachedClient = null;
    return null;
  }

  cachedClient = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cachedClient;
}

export function resetSupabaseBrowserClientForTests(): void {
  cachedClient = undefined;
}