"use client";

import React from "react";
import { useDesktopAgentContext } from "@/lib/desktop-agent/desktop-agent-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Cpu, Wifi, WifiOff, AlertTriangle } from "lucide-react";

export function DesktopAgentBadge() {
  const { connectionState, health } = useDesktopAgentContext();

  const getStatusDetails = () => {
    switch (connectionState) {
      case "online":
        return {
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
          dotColor: "bg-emerald-400 animate-pulse",
          text: "Desktop Voice Online",
          icon: <Wifi className="w-4 h-4 mr-1.5 text-emerald-400" />,
          tooltip: `JARVIS Voice active on Mac. Model: ${health?.gemini_live_model || "Gemini 2.5 Live"}. Tools loaded: ${health?.tools_available || 17}. Uptime: ${health ? Math.round(health.uptime_sec / 60) : 0}m.`,
        };
      case "degraded":
        return {
          color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
          dotColor: "bg-amber-400",
          text: "Memory Sync Disabled",
          icon: <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-400" />,
          tooltip: "Desktop JARVIS connected, but cloud memory synchronization is degraded or not configured.",
        };
      case "offline":
      default:
        return {
          color: "text-zinc-500 bg-zinc-500/5 border-zinc-500/20",
          dotColor: "bg-zinc-600",
          text: "Voice Agent Offline",
          icon: <WifiOff className="w-4 h-4 mr-1.5 text-zinc-500" />,
          tooltip: "Desktop voice agent is offline. Run 'make -C desktop-agent run' to start Tony Stark mode.",
        };
    }
  };

  const details = getStatusDetails();

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium backdrop-blur-md transition-all cursor-help ${details.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${details.dotColor}`} />
            {details.icon}
            <span>{details.text}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-xs p-3 text-xs bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono shadow-xl rounded-lg"
        >
          <div className="space-y-1">
            <p className="font-bold text-zinc-100 flex items-center">
              <Cpu className="w-3.5 h-3.5 mr-1 text-sky-400" />
              JARVIS Desktop Voice
            </p>
            <p className="leading-relaxed">{details.tooltip}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
export default DesktopAgentBadge;
