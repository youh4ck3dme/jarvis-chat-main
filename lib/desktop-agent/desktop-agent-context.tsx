"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useDesktopAgentPolling } from "./use-desktop-agent";

type DesktopAgentContextValue = ReturnType<typeof useDesktopAgentPolling>;

const DesktopAgentContext = createContext<DesktopAgentContextValue | null>(null);

export function DesktopAgentProvider({ children }: { children: ReactNode }) {
  const value = useDesktopAgentPolling();
  return (
    <DesktopAgentContext.Provider value={value}>{children}</DesktopAgentContext.Provider>
  );
}

export function useDesktopAgentContext(): DesktopAgentContextValue {
  const context = useContext(DesktopAgentContext);
  if (!context) {
    throw new Error("useDesktopAgentContext must be used within DesktopAgentProvider");
  }
  return context;
}