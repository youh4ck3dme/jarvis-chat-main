import { DESKTOP_AGENT_FETCH_TIMEOUT_MS, DESKTOP_AGENT_HEALTH_URL } from "./constants";
import type { DesktopAgentHealth } from "./types";

/**
 * Performs a health poll request to the local desktop voice agent's FastAPI instance.
 * Aborts connection attempts after DESKTOP_AGENT_FETCH_TIMEOUT_MS to prevent blocking the UI loop.
 */
export async function fetchDesktopAgentHealth(): Promise<DesktopAgentHealth | null> {
  // Avoid server-side fetch to localhost during Vercel builds or server-side render
  if (typeof window === "undefined") {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DESKTOP_AGENT_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(DESKTOP_AGENT_HEALTH_URL, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as DesktopAgentHealth;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
