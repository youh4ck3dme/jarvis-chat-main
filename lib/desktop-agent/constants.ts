export const DESKTOP_AGENT_PORT =
  Number(process.env.NEXT_PUBLIC_DESKTOP_AGENT_PORT ?? "8765");

export const DESKTOP_AGENT_HEALTH_URL =
  `http://127.0.0.1:${DESKTOP_AGENT_PORT}/health`;

export const DESKTOP_AGENT_CONVERSATION_ID =
  process.env.NEXT_PUBLIC_DESKTOP_AGENT_CONVERSATION_ID ?? "desktop-voice-session";

export const DESKTOP_AGENT_POLL_INTERVAL_MS = 5000;
export const DESKTOP_AGENT_FETCH_TIMEOUT_MS = 1500;
