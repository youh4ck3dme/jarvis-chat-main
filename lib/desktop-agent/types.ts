export type DesktopAgentHealth = {
  status: "ok" | "degraded" | "error";
  agent_version: string;
  platform: string;
  gemini_live_model: string;
  conversation_id: string;
  memory_sync: {
    enabled: boolean;
    last_sync_at: string | null;
    web_base_url: string;
  };
  tools_available: number;
  uptime_sec: number;
};

export type DesktopAgentConnectionState =
  | "unknown"      // Initial state before first check
  | "offline"      // Cannot connect / Connection refused
  | "online"       // Connected and healthy
  | "degraded";    // Connected but memory sync is disabled
