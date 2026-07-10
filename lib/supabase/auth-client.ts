import type { Session, User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "./browser-client";

export type JarvisAuthState = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
};

export async function getJarvisAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function getJarvisAuthSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function signInWithMagicLink(email: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return { ok: false, error: "Supabase auth nie je nakonfigurovaný." };
  }

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function signOutJarvis(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function subscribeJarvisAuth(
  onChange: (state: { user: User | null; session: Session | null }) => void,
): () => void {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    onChange({ user: null, session: null });
    return () => {};
  }

  void supabase.auth.getSession().then(({ data }) => {
    onChange({ user: data.session?.user ?? null, session: data.session ?? null });
  });

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange({ user: session?.user ?? null, session: session ?? null });
  });

  return () => {
    data.subscription.unsubscribe();
  };
}