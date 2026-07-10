import { describe, expect, it } from "vitest";

import {
  DESKTOP_AGENT_CONVERSATION_ID,
  DESKTOP_AGENT_HEALTH_URL,
  DESKTOP_AGENT_PORT,
} from "./constants";

describe("desktop-agent constants", () => {
  it("uses default health port and conversation id", () => {
    expect(DESKTOP_AGENT_PORT).toBe(8765);
    expect(DESKTOP_AGENT_HEALTH_URL).toBe("http://127.0.0.1:8765/health");
    expect(DESKTOP_AGENT_CONVERSATION_ID).toBe("desktop-voice-session");
  });
});