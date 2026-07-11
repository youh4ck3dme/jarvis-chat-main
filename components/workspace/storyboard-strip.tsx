"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  HelpCircle,
  Image,
  LayoutTemplate,
  Mail,
  Menu,
  PanelBottom,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

import {
  formatSectionLabel,
  resolveStoryboardSections,
  STORYBOARD_PLANNING_STEPS,
  STORYBOARD_STEP_INTERVAL_MS,
  storyboardStatusFromPlan,
} from "@/lib/chat/storyboard-strip";
import type { BuildPlan } from "@/types/build";
import { cn } from "@/lib/utils";

type StoryboardStripProps = {
  plan: BuildPlan | null;
  isPlanning: boolean;
  className?: string;
};

function sectionIcon(section: string) {
  const key = section.toLowerCase();
  if (key.includes("hero")) return LayoutTemplate;
  if (key.includes("nav") || key.includes("menu")) return Menu;
  if (key.includes("contact") || key.includes("mail")) return Mail;
  if (key.includes("footer")) return PanelBottom;
  if (key.includes("pricing")) return CreditCard;
  if (key.includes("faq")) return HelpCircle;
  if (key.includes("gallery") || key.includes("image")) return Image;
  if (key.includes("testimonial") || key.includes("review")) return Star;
  if (key.includes("about") || key.includes("team")) return Users;
  if (key.includes("feature")) return Sparkles;
  return LayoutTemplate;
}

export function StoryboardStrip({ plan, isPlanning, className }: StoryboardStripProps) {
  const sections = useMemo(() => resolveStoryboardSections(plan), [plan]);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!isPlanning) {
      setStepIndex(0);
      return;
    }

    setStepIndex(0);
    const timer = window.setInterval(() => {
      setStepIndex((current) =>
        current >= STORYBOARD_PLANNING_STEPS.length - 1 ? current : current + 1,
      );
    }, STORYBOARD_STEP_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isPlanning]);

  const planningStep = STORYBOARD_PLANNING_STEPS[stepIndex] ?? STORYBOARD_PLANNING_STEPS[0];
  const activeCardIndex = isPlanning
    ? planningStep.cardIndex >= 0
      ? Math.min(planningStep.cardIndex, sections.length - 1)
      : -1
    : -1;

  const statusMessage = isPlanning
    ? planningStep.statusMessage
    : plan
      ? storyboardStatusFromPlan(plan)
      : "";

  if (!isPlanning && !plan) return null;

  return (
    <section
      className={cn(
        "animate-slide-up border-t border-border bg-panel px-3 py-3 md:px-4",
        className,
      )}
      data-testid="storyboard-strip"
      aria-live="polite"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Storyboard · Planner
        </h3>
        {isPlanning ? (
          <span className="text-[10px] font-medium text-emerald-400/80">Fáza 1</span>
        ) : (
          <span className="text-[10px] font-medium text-muted-foreground">Plán hotový</span>
        )}
      </div>

      <div className="relative -mx-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
        <div className="flex min-w-max items-end gap-2 px-1">
          {sections.map((section, index) => {
            const Icon = sectionIcon(section);
            const isActive = activeCardIndex === index;
            const isDone = !isPlanning && Boolean(plan);
            const isPending = isPlanning && index > activeCardIndex && activeCardIndex >= 0;

            return (
              <div
                key={`${section}-${index}`}
                className={cn(
                  "storyboard-card relative w-[108px] shrink-0 rounded-xl border px-2.5 py-2.5 transition-all duration-500",
                  isActive
                    ? "storyboard-card-active z-10 scale-105 border-emerald-500/50 bg-[#1a2420] shadow-lg shadow-emerald-900/20"
                    : isDone
                      ? "border-[#2f3f35] bg-[#171c19]"
                      : "border-border bg-panel",
                  isPending && "opacity-45",
                  !isPlanning && !isDone && "opacity-70",
                )}
                data-testid={`storyboard-card-${index}`}
                data-active={isActive ? "true" : "false"}
              >
                <div
                  className={cn(
                    "mb-2 flex h-14 items-center justify-center rounded-lg border border-dashed",
                    isActive
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border bg-background",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-emerald-400" : isDone ? "text-muted-foreground" : "text-muted-foreground",
                    )}
                  />
                </div>
                <p
                  className={cn(
                    "truncate text-center text-[11px] font-semibold",
                    isActive ? "text-emerald-200" : "text-fg/80",
                  )}
                >
                  {formatSectionLabel(section)}
                </p>
                {isDone ? (
                  <p className="mt-0.5 text-center text-[9px] text-emerald-500/70">✓</p>
                ) : isActive ? (
                  <p className="mt-0.5 text-center text-[9px] text-emerald-400/60">…</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <p
        className={cn(
          "mt-2.5 min-h-[1.25rem] text-[12px] transition-opacity",
          isPlanning ? "animate-fade-in text-emerald-300/90" : "text-muted-foreground",
        )}
        data-testid="storyboard-status"
        key={isPlanning ? planningStep.statusMessage : statusMessage}
      >
        {statusMessage}
      </p>
    </section>
  );
}