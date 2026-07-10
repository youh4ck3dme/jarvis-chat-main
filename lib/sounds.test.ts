import { describe, expect, it } from "vitest";

import { SOUND_CLICK_URL, SOUND_LAUNCH_URL, SOUND_RECORD_URL } from "./sounds";

describe("sounds", () => {
  it("serves audio from local public paths", () => {
    expect(SOUND_CLICK_URL).toBe("/sounds/click.mp3");
    expect(SOUND_RECORD_URL).toBe("/sounds/record.mp3");
    expect(SOUND_LAUNCH_URL).toBe("/sounds/launch.mp3");
  });
});