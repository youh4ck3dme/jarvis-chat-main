"use client";

import { useState } from "react";
import { Hammer, MessageCircle, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { requestBuilderUnlock } from "@/lib/chat/builder-unlock-client";
import { type JarvisMode, modeLabel } from "@/lib/chat/jarvis-mode";
import { cn } from "@/lib/utils";

type JarvisModeControlProps = {
  mode: JarvisMode;
  builderUnlocked: boolean;
  onModeChange: (mode: JarvisMode) => void;
  onBuilderUnlock: () => void;
  unlockDialogOpen?: boolean;
  onUnlockDialogOpenChange?: (open: boolean) => void;
};

export function JarvisModeControl({
  mode,
  builderUnlocked,
  onModeChange,
  onBuilderUnlock,
  unlockDialogOpen,
  onUnlockDialogOpenChange,
}: JarvisModeControlProps) {
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const dialogOpen = unlockDialogOpen ?? internalDialogOpen;
  const setDialogOpen = onUnlockDialogOpenChange ?? setInternalDialogOpen;
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const openBuilderDialog = () => {
    setPassword("");
    setError(null);
    setDialogOpen(true);
  };

  const handleActivateBuilder = async () => {
    if (isVerifying) return;

    setIsVerifying(true);
    setError(null);

    try {
      const result = await requestBuilderUnlock(password);
      if (!result.ok) {
        setError(result.error ?? "Nesprávne heslo. Builder režim je chránený.");
        return;
      }

      onBuilderUnlock();
      onModeChange("builder");
      setDialogOpen(false);
      setPassword("");
      setError(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSwitchToChat = () => {
    onModeChange("chat");
  };

  return (
    <>
      <div
        className="flex max-w-[9.5rem] shrink-0 items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5 sm:max-w-none sm:gap-1"
        data-testid="jarvis-mode-control"
      >
        <button
          type="button"
          onClick={handleSwitchToChat}
          className={cn(
            "flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all sm:min-h-0 sm:min-w-0 sm:justify-start sm:gap-1.5 sm:px-2.5",
            mode === "chat"
              ? "bg-border/50 text-fg shadow-sm"
              : "text-muted-foreground hover:text-fg"
          )}
          data-testid="jarvis-mode-chat"
        >
          <MessageCircle className="h-3 w-3 shrink-0" />
          <span className="hidden sm:inline">Chat</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (builderUnlocked && mode === "builder") return;
            if (builderUnlocked) {
              onModeChange("builder");
            } else {
              openBuilderDialog();
            }
          }}
          className={cn(
            "flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all sm:min-h-0 sm:min-w-0 sm:justify-start sm:gap-1.5 sm:px-2.5",
            mode === "builder"
              ? "bg-border/50 text-fg shadow-sm"
              : "text-muted-foreground hover:text-fg"
          )}
          data-testid="jarvis-mode-builder"
          title={builderUnlocked ? "Builder režim" : "Odomkni Builder heslom"}
        >
          {builderUnlocked ? (
            <Hammer className="h-3 w-3" />
          ) : (
            <Lock className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">Builder</span>
        </button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-white/10 bg-panel text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Unlock className="h-4 w-4 text-amber-400" />
              Aktivovať Builder režim
            </DialogTitle>
            <DialogDescription className="text-white/55">
              Predvolene Jarvis funguje ako chat. Po zadaní hesla sa prepne na
              Builder agenta, ktorý generuje HTML artefakty a spúšťa build
              pipeline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label htmlFor="builder-password" className="text-xs text-white/50">
              Heslo
            </label>
            <Input
              id="builder-password"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Zadaj heslo…"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleActivateBuilder();
              }}
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              data-testid="builder-password-input"
            />
            {error ? (
              <p className="text-xs text-red-400" data-testid="builder-password-error">
                {error}
              </p>
            ) : (
              <p className="text-xs text-white/40">
                Staré heslo <span className="font-mono">2366</span> už neplatí. Heslo má 8 číslic
                z <span className="font-mono">.env.local</span> →{" "}
                <span className="font-mono">BUILDER_UNLOCK_PASSWORD</span>.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-white/60 hover:text-white"
            >
              Zrušiť
            </Button>
            <Button
              type="button"
              onClick={() => void handleActivateBuilder()}
              disabled={isVerifying || password.trim().length === 0}
              className="bg-amber-500/90 text-black hover:bg-amber-400"
              data-testid="builder-activate-button"
            >
              {isVerifying ? "Overujem…" : `Aktivovať ${modeLabel("builder")}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}