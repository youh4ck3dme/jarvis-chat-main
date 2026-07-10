import { createClient } from "@supabase/supabase-js";

import { jsonError } from "@/lib/api-response";

import { resolveSupabasePublicConfig } from "./config";

export type VerifiedAuthUser = {
  userId: string;
  email: string | null;
};

export type AuthVerificationResult =
  | { ok: true; user: VerifiedAuthUser }
  | { ok: false; response: Response };

function readBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization")?.trim();
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const token = header.slice(7).trim();
  return token || null;
}

export async function verifyRequestAuth(req: Request): Promise<AuthVerificationResult> {
  const config = resolveSupabasePublicConfig();
  if (!config) {
    return {
      ok: false,
      response: jsonError(
        "Supabase auth nie je nakonfigurovaný (NEXT_PUBLIC_SUPABASE_ANON_KEY).",
        503,
      ),
    };
  }

  const token = readBearerToken(req);
  if (!token) {
    return {
      ok: false,
      response: jsonError("Prihlás sa pre cloud sync (chýba Bearer token).", 401),
    };
  }

  const supabase = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return {
      ok: false,
      response: jsonError("Neplatný alebo expirovaný auth token.", 401),
    };
  }

  return {
    ok: true,
    user: {
      userId: data.user.id,
      email: data.user.email ?? null,
    },
  };
}