"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Prihlasujem do Jarvis…");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Supabase auth nie je nakonfigurovaný.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      router.replace("/chat");
      return;
    }

    void supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setMessage(error.message);
          return;
        }
        router.replace("/chat");
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Prihlásenie zlyhalo.");
      });
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-6 text-center text-fg">
      <p className="text-sm text-fg/80">{message}</p>
    </main>
  );
}