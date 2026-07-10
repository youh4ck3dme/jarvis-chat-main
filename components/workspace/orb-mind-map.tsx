"use client";

import { useEffect, useMemo, useState } from "react";
import { Hammer, Palette, Sparkles, Target } from "lucide-react";

import { AnimatedOrb } from "@/components/chat/animated-orb";
import {
  buildMindMapNodesFromPlan,
  getOrbitPosition,
  ORB_NODE_REVEAL_INTERVAL_MS,
  ORB_PLANNING_NODE_SEQUENCE,
  type MindMapNode,
} from "@/lib/chat/orb-mind-map";
import { JARVIS_ORB_CHAT_IDLE } from "@/lib/chat/jarvis-story";
import type { BuildPlan } from "@/types/build";
import { cn } from "@/lib/utils";

export type OrbMindMapVariant = "chat" | "builder";

type OrbMindMapProps = {
  isPlanning: boolean;
  plan: BuildPlan | null;
  isStreaming?: boolean;
  variant?: OrbMindMapVariant;
  className?: string;
};

function nodeIcon(kind: MindMapNode["kind"]) {
  if (kind === "color") return Palette;
  if (kind === "cta") return Target;
  if (kind === "section") return Sparkles;
  return Sparkles;
}

function nodeStyles(kind: MindMapNode["kind"]) {
  if (kind === "color") return "border-sky-500/40 bg-sky-950/40 text-sky-200";
  if (kind === "cta") return "border-amber-500/40 bg-amber-950/40 text-amber-200";
  return "border-emerald-500/35 bg-emerald-950/35 text-emerald-200";
}

export function OrbMindMap({
  isPlanning,
  plan,
  isStreaming = false,
  variant = "builder",
  className,
}: OrbMindMapProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const planningNodes = ORB_PLANNING_NODE_SEQUENCE;
  const planNodes = useMemo(
    () => (plan ? buildMindMapNodesFromPlan(plan) : []),
    [plan],
  );

  const activeNodes = isPlanning ? planningNodes.slice(0, revealedCount) : planNodes;
  const orbitRadius = 118;

  useEffect(() => {
    if (!isPlanning) {
      setRevealedCount(0);
      return;
    }

    setCollapsed(false);
    setRevealedCount(1);

    const timer = window.setInterval(() => {
      setRevealedCount((current) =>
        current >= planningNodes.length ? current : current + 1,
      );
    }, ORB_NODE_REVEAL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isPlanning, planningNodes.length]);

  useEffect(() => {
    if (!plan || isPlanning) {
      setCollapsed(false);
      return;
    }

    const timer = window.setTimeout(() => setCollapsed(true), 500);
    return () => window.clearTimeout(timer);
  }, [plan, isPlanning]);

  const showIdle = !isPlanning && !plan && !isStreaming;
  const builderIdleText = "Tu sa zrodí tvoj build";
  const statusText = isStreaming && !isPlanning
    ? "Generujem HTML do živého preview…"
    : isPlanning
      ? "Mapujem myšlienky do orbitálneho plánu…"
      : collapsed
        ? "Plán je hotový — spúšťam build"
        : plan
          ? "Uzly sa zbiehajú do jedného bodu…"
          : variant === "chat"
            ? JARVIS_ORB_CHAT_IDLE
            : builderIdleText;

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-canvas",
        className,
      )}
      data-testid="orb-mind-map"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-500/10" />
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-emerald-500/5 orb-mind-orbit-ring" />
      </div>

      <div className="relative h-[300px] w-[300px]">
        {activeNodes.map((node, index) => {
          const position = getOrbitPosition(index, activeNodes.length, orbitRadius);
          const Icon = nodeIcon(node.kind);

          return (
            <div
              key={`${node.id}-${index}`}
              className={cn(
                "orb-mind-node absolute left-1/2 top-1/2 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-lg transition-all duration-500",
                nodeStyles(node.kind),
                collapsed && "orb-mind-node-collapse",
              )}
              style={{
                transform: collapsed
                  ? "translate(-50%, -50%) scale(0)"
                  : `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(1)`,
                opacity: collapsed ? 0 : 1,
                transitionDelay: collapsed ? `${index * 40}ms` : `${index * 80}ms`,
              }}
              data-testid={`orb-mind-node-${node.id}`}
            >
              <Icon className="h-3 w-3 shrink-0 opacity-80" />
              <span className="max-w-[88px] truncate">{node.label}</span>
            </div>
          );
        })}

        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <AnimatedOrb size={72} className="shadow-[0_0_40px_rgba(52,211,153,0.25)]" />
        </div>

        <div
          className={cn(
            "absolute left-1/2 top-[calc(50%+92px)] z-20 -translate-x-1/2 transition-all duration-500",
            collapsed
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-75 opacity-0",
          )}
          data-testid="orb-mind-build-button"
        >
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition-transform hover:scale-105"
            aria-label="Build"
          >
            <Hammer className="h-4 w-4" />
            Build
          </button>
        </div>
      </div>

      <p
        className={cn(
          "mt-2 max-w-xs text-center text-[12px] transition-colors",
          isPlanning || collapsed ? "text-emerald-300/80" : showIdle ? "text-zinc-500" : "text-zinc-400",
        )}
        data-testid="orb-mind-status"
      >
        {statusText}
      </p>
    </div>
  );
}