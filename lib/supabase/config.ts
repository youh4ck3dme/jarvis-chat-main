export type SupabaseServerConfig = {
  url: string;
  serviceRoleKey: string;
};

export function resolveSupabaseServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): SupabaseServerConfig | null {
  const url = env.SUPABASE_URL?.trim() || env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}

export function isSupabaseSyncConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveSupabaseServerConfig(env) !== null;
}