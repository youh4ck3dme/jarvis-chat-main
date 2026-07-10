import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { resolveSupabaseServerConfig } from "./config";

let cachedClient: SupabaseClient | null | undefined;

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const config = resolveSupabaseServerConfig();
  if (!config) {
    cachedClient = null;
    return null;
  }

  cachedClient = createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
}

export function resetSupabaseAdminClientForTests(): void {
  cachedClient = undefined;
}