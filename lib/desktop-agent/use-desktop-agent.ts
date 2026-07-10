"use client";

import { useEffect, useState, useCallback } from "react";
import { DESKTOP_AGENT_POLL_INTERVAL_MS } from "./constants";
import { fetchDesktopAgentHealth } from "./health-client";
import type { DesktopAgentHealth, DesktopAgentConnectionState } from "./types";

/**
 * React hook to poll the local desktop voice agent's health endpoint.
 * Exposes connection state, raw health data, and manual refresh controls.
 */
export function useDesktopAgentPolling() {
  const [connectionState, setConnectionState] = useState<DesktopAgentConnectionState>("unknown");
  const [health, setHealth] = useState<DesktopAgentHealth | null>(null);

  const poll = useCallback(async () => {
    const data = await fetchDesktopAgentHealth();
    if (data) {
      setHealth(data);
      if (data.status === "ok") {
        setConnectionState(data.memory_sync?.enabled ? "online" : "degraded");
      } else {
        setConnectionState("degraded");
      }
    } else {
      setHealth(null);
      setConnectionState("offline");
    }
  }, []);

  useEffect(() => {
    // Initial check
    poll();

    const timer = setInterval(() => {
      poll();
    }, DESKTOP_AGENT_POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [poll]);

  return {
    connectionState,
    health,
    refresh: poll,
    isOnline: connectionState === "online" || connectionState === "degraded",
  };
}

/** Standalone hook for components outside DesktopAgentProvider (e.g. composer). */
export function useDesktopAgent() {
  return useDesktopAgentPolling();
}
