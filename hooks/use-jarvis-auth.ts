"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { migrateDeviceDataToUserAccount } from "@/lib/chat/device-migration";
import {
  signInWithMagicLink,
  signOutJarvis,
  subscribeJarvisAuth,
} from "@/lib/supabase/auth-client";

export function useJarvisAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeJarvisAuth(async ({ user: nextUser, session: nextSession }) => {
      setUser(nextUser);
      setSession(nextSession);
      setIsLoading(false);

      if (nextUser) {
        try {
          await migrateDeviceDataToUserAccount();
        } catch (error) {
          console.warn("Device-to-user migration failed:", error);
        }
      }
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string) => {
    setIsSubmitting(true);
    setStatusMessage(null);

    const result = await signInWithMagicLink(email);
    setIsSubmitting(false);

    if (!result.ok) {
      setStatusMessage(result.error ?? "Prihlásenie zlyhalo.");
      return false;
    }

    setStatusMessage("Magic link odoslaný — skontroluj email a klikni na odkaz.");
    return true;
  }, []);

  const signOut = useCallback(async () => {
    await signOutJarvis();
    setStatusMessage(null);
  }, []);

  return {
    user,
    session,
    isAuthenticated: Boolean(user && session),
    isLoading,
    isSubmitting,
    statusMessage,
    signIn,
    signOut,
  };
}