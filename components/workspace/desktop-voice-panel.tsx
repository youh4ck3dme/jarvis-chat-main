"use client";

import React from "react";
import { useDesktopAgentContext } from "@/lib/desktop-agent/desktop-agent-context";
import { DESKTOP_AGENT_HEALTH_URL } from "@/lib/desktop-agent/constants";
import { ExternalLink, Mic, ShieldAlert, Cpu } from "lucide-react";
import toolManifest from "@/shared/tool-manifest.json";

export function DesktopVoicePanel() {
  const { connectionState, health } = useDesktopAgentContext();

  if (connectionState !== "online" && connectionState !== "degraded") {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-4 text-xs font-mono text-zinc-500">
        <div className="flex items-center text-zinc-400 font-bold mb-1.5">
          <ShieldAlert className="w-3.5 h-3.5 mr-1 text-zinc-500" />
          Hlasový JARVIS offline
        </div>
        <p className="mb-2 leading-relaxed">
          Ak chceš využívať hlasové ovládanie a lokálne macOS nástroje, spusti:
        </p>
        <code className="block bg-zinc-900 px-2 py-1 rounded text-zinc-300 select-all border border-zinc-800">
          make -C desktop-agent run
        </code>
      </div>
    );
  }

  // Pick top tools to display
  const topTools = toolManifest.filter((t) =>
    ["open_app", "web_search", "weather_report", "reminder", "screen_process"].includes(t.name)
  );

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-md p-4 text-xs font-mono text-zinc-300 space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
        <div className="flex items-center font-bold text-sky-400">
          <Cpu className="w-4 h-4 mr-1.5 text-sky-400 animate-pulse" />
          JARVIS Voice Active
        </div>
        <a
          href={DESKTOP_AGENT_HEALTH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Health <ExternalLink className="w-3 h-3 ml-1" />
        </a>
      </div>

      <div className="space-y-1.5 text-[11px] text-zinc-400">
        <div className="flex justify-between">
          <span>Model:</span>
          <span className="text-zinc-300 text-right max-w-[150px] truncate">{health?.gemini_live_model || "Gemini 2.5 Live"}</span>
        </div>
        <div className="flex justify-between">
          <span>Uptime:</span>
          <span className="text-zinc-300">{health ? Math.round(health.uptime_sec / 60) : 0} minút</span>
        </div>
        <div className="flex justify-between">
          <span>Nástroje:</span>
          <span className="text-zinc-300">{health?.tools_available || 0} pripravených</span>
        </div>
      </div>

      <div className="bg-sky-500/5 border border-sky-500/10 rounded-lg p-2.5 flex items-start gap-2 text-sky-300/90 leading-relaxed text-[11px]">
        <Mic className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
        <div>
          Hlasový JARVIS beží na Macu. Rozprávaj sa priamo s ním cez PyQt6 rozhranie.
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
          Dostupné macOS nástroje
        </span>
        <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
          {topTools.map((t) => (
            <div key={t.name} className="flex items-center justify-between bg-zinc-950/40 border border-zinc-900 rounded p-1.5 text-[10px]">
              <span className="font-bold text-zinc-300">{t.name}</span>
              <span className="text-zinc-500 italic max-w-[120px] truncate">{t.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default DesktopVoicePanel;
