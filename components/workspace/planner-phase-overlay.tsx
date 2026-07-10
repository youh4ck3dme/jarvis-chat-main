"use client";

import { cn } from "@/lib/utils";

type PlannerPhaseOverlayProps = {
  className?: string;
  label?: string;
};

/**
 * Blueprint Grid — planner-phase loading animation.
 * Animated grid with scanning beam while phase 1 (planner) runs.
 */
export function PlannerPhaseOverlay({
  className,
  label = "Fáza 1 · Planner analyzuje tvoju víziu…",
}: PlannerPhaseOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden bg-background/92 backdrop-blur-sm",
        className,
      )}
      data-testid="planner-phase-overlay"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="relative h-48 w-full max-w-md px-8">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(52,211,153,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(52,211,153,0.15) 1px, transparent 1px)
            `,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="planner-scan-beam absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-emerald-400/25 via-emerald-400/5 to-transparent" />

        <div className="absolute left-[18%] top-[22%] h-2 w-2 animate-pulse rounded-full bg-emerald-400/80" />
        <div className="absolute left-[42%] top-[38%] h-2 w-2 animate-pulse rounded-full bg-emerald-400/60 [animation-delay:200ms]" />
        <div className="absolute left-[68%] top-[28%] h-2 w-2 animate-pulse rounded-full bg-emerald-400/70 [animation-delay:400ms]" />
        <div className="absolute left-[55%] top-[62%] h-2 w-2 animate-pulse rounded-full bg-amber-400/60 [animation-delay:600ms]" />
        <div className="absolute left-[28%] top-[68%] h-2 w-2 animate-pulse rounded-full bg-emerald-400/50 [animation-delay:300ms]" />

        <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden>
          <line x1="18%" y1="24%" x2="42%" y2="40%" stroke="rgb(52,211,153)" strokeWidth="1" />
          <line x1="42%" y1="40%" x2="68%" y2="30%" stroke="rgb(52,211,153)" strokeWidth="1" />
          <line x1="42%" y1="40%" x2="55%" y2="64%" stroke="rgb(251,191,36)" strokeWidth="1" />
          <line x1="28%" y1="70%" x2="55%" y2="64%" stroke="rgb(52,211,153)" strokeWidth="1" />
        </svg>
      </div>

      <p className="mt-6 text-center text-[13px] font-medium tracking-wide text-emerald-300/90">
        {label}
      </p>
      <p className="mt-1 text-center text-[11px] text-white/35">
        Sekcie · farby · CTA · štruktúra
      </p>
    </div>
  );
}