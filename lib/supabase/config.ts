export type SupabaseServerConfig = {
  url: string;
  serviceRoleKey: string;
};

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export function resolveSupabaseUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const url = env.SUPABASE_URL?.trim() || env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return url || null;
}

export function resolveSupabaseServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): SupabaseServerConfig | null {
  const url = resolveSupabaseUrl(env);
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}

export function resolveSupabasePublicConfig(
  env: NodeJS.ProcessEnv = process.env,
): SupabasePublicConfig | null {
  const url = resolveSupabaseUrl(env);
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseSyncConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveSupabaseServerConfig(env) !== null;
}

export function isSupabaseAuthConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    isSupabaseSyncConfigured(env) && resolveSupabasePublicConfig(env) !== null
  );
}