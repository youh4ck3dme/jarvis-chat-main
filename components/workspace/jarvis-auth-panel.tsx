"use client";

import { useState } from "react";
import { LogIn, LogOut, Mail } from "lucide-react";

import { useJarvisAuth } from "@/hooks/use-jarvis-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type JarvisAuthPanelProps = {
  authConfigured: boolean;
  className?: string;
};

export function JarvisAuthPanel({ authConfigured, className }: JarvisAuthPanelProps) {
  const { user, isAuthenticated, isLoading, isSubmitting, statusMessage, signIn, signOut } =
    useJarvisAuth();
  const [email, setEmail] = useState("");

  if (!authConfigured) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-surface px-3 py-3 text-[12px] text-muted-foreground",
          className,
        )}
        data-testid="jarvis-auth-unconfigured"
      >
        Cloud účet vyžaduje `NEXT_PUBLIC_SUPABASE_ANON_KEY` na Vercel.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-border bg-surface px-3 py-3", className)}>
        <p className="text-[12px] text-muted-foreground">Načítavam prihlásenie…</p>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div
        className={cn(
          "space-y-2 rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-3 py-3",
          className,
        )}
        data-testid="jarvis-auth-signed-in"
      >
        <div className="flex items-start gap-2">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-emerald-100">Prihlásený účet</p>
            <p className="truncate text-[12px] text-emerald-200/80">{user.email}</p>
            <p className="mt-1 text-[11px] text-emerald-200/60">
              Sync naprieč zariadeniami pod jedným účtom
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-border bg-surface text-fg/80 hover:bg-surface"
          onClick={() => void signOut()}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Odhlásiť sa
        </Button>
      </div>
    );
  }

  return (
    <form
      className={cn(
        "space-y-2 rounded-xl border border-border bg-surface px-3 py-3",
        className,
      )}
      data-testid="jarvis-auth-sign-in"
      onSubmit={(event) => {
        event.preventDefault();
        void signIn(email);
      }}
    >
      <div className="flex items-start gap-2">
        <LogIn className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-fg">Prihlásenie pre cloud sync</p>
          <p className="text-[11px] text-muted-foreground">
            Magic link na email — rovnaké dáta na telefóne aj počítači
          </p>
        </div>
      </div>
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="tvoj@email.com"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-fg outline-none ring-ring/30 focus:ring-2"
        aria-label="Email pre prihlásenie"
      />
      <Button
        type="submit"
        size="sm"
        disabled={isSubmitting || !email.trim()}
        className="w-full bg-emerald-600 text-white hover:bg-emerald-500"
      >
        {isSubmitting ? "Odosielam…" : "Poslať magic link"}
      </Button>
      {statusMessage ? (
        <p className="text-[11px] leading-relaxed text-subtle">{statusMessage}</p>
      ) : null}
    </form>
  );
}