import { describe, expect, it } from "vitest";

import { evaluateMediaQuery } from "./responsive-test-utils";
import { IPHONE_17_AIR, IPHONE_17_AIR_LANDSCAPE, isMobileWidth } from "./viewport-presets";

describe("viewport presets", () => {
  it("defines iPhone 17 Air at 420x912 with 3x DPR", () => {
    expect(IPHONE_17_AIR.width).toBe(420);
    expect(IPHONE_17_AIR.height).toBe(912);
    expect(IPHONE_17_AIR.devicePixelRatio).toBe(3);
  });

  it("treats iPhone 17 Air width as mobile", () => {
    expect(isMobileWidth(IPHONE_17_AIR.width)).toBe(true);
    expect(isMobileWidth(1280)).toBe(false);
  });

  it("evaluates media queries for iPhone 17 Air portrait", () => {
    expect(evaluateMediaQuery("(max-width: 767px)", IPHONE_17_AIR)).toBe(true);
    expect(evaluateMediaQuery("(min-width: 420px)", IPHONE_17_AIR)).toBe(true);
    expect(evaluateMediaQuery("(orientation: portrait)", IPHONE_17_AIR)).toBe(true);
    expect(evaluateMediaQuery("(-webkit-min-device-pixel-ratio: 3)", IPHONE_17_AIR)).toBe(true);
  });

  it("evaluates landscape orientation for iPhone 17 Air rotated", () => {
    expect(evaluateMediaQuery("(orientation: landscape)", IPHONE_17_AIR_LANDSCAPE)).toBe(true);
    expect(IPHONE_17_AIR_LANDSCAPE.width).toBe(912);
    expect(IPHONE_17_AIR_LANDSCAPE.height).toBe(420);
  });
});