import { afterEach, describe, expect, it } from "vitest";

import {
  createNarrativeBeat,
  detectBuildIntent,
  JARVIS_STORY_BUILD_INTENT,
  JARVIS_STORY_BUILD_SUCCESS,
  JARVIS_STORY_NUDGE_SHOWN_KEY,
  JARVIS_STORY_PLAN_READY,
  markStoryNudgeShown,
  readStoryNudgeShown,
  resetStoryNudgeForTests,
} from "./jarvis-story";

describe("jarvis-story", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("detects Slovak and English build intents", () => {
    expect(detectBuildIntent("Ahoj")).toBe(false);
    expect(detectBuildIntent("urob mi landing page pre kaviareň")).toBe(true);
    expect(detectBuildIntent("postav webovú stránku pre fitness")).toBe(true);
    expect(detectBuildIntent("Build me a landing page for a coffee shop")).toBe(true);
    expect(detectBuildIntent("chcem stránku pre môj biznis")).toBe(true);
  });

  it("exposes narrative beats for the build handoff", () => {
    expect(JARVIS_STORY_BUILD_INTENT).toContain("rozložím");
    expect(JARVIS_STORY_PLAN_READY).toContain("kódujem");
    expect(JARVIS_STORY_BUILD_SUCCESS).toContain("Hotovo");

    const beat = createNarrativeBeat("beat-1", JARVIS_STORY_BUILD_INTENT);
    expect(beat.narrative).toBe(true);
    expect(beat.role).toBe("assistant");
  });

  it("tracks story nudge per session", () => {
    expect(readStoryNudgeShown()).toBe(false);
    markStoryNudgeShown();
    expect(readStoryNudgeShown()).toBe(true);
    expect(sessionStorage.getItem(JARVIS_STORY_NUDGE_SHOWN_KEY)).toBe("true");
    resetStoryNudgeForTests();
    expect(readStoryNudgeShown()).toBe(false);
  });
});