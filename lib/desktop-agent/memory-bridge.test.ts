import { describe, expect, it } from "vitest";
import {
  getDesktopVoiceConversationId,
  isDesktopVoiceEntry,
  formatDesktopMemoryForDisplay,
} from "./memory-bridge";

describe("memory-bridge", () => {
  it("resolves the fixed voice conversation ID", () => {
    expect(getDesktopVoiceConversationId()).toBe("desktop-voice-session");
  });

  it("checks tag membership for voice entries", () => {
    const validEntry = {
      metadata: {
        tags: ["user", "desktop-voice"],
      },
    };
    const invalidEntry = {
      metadata: {
        tags: ["user"],
      },
    };
    expect(isDesktopVoiceEntry(validEntry)).toBe(true);
    expect(isDesktopVoiceEntry(invalidEntry)).toBe(false);
  });

  it("pretty formats structured key-value entries", () => {
    const raw = "favorite_editor: Cursor";
    const formatted = formatDesktopMemoryForDisplay(raw);
    expect(formatted).toBe("Favorite editor: Cursor");

    const nonStructured = "Regular unstructured fact about user";
    expect(formatDesktopMemoryForDisplay(nonStructured)).toBe(nonStructured);
  });
});
