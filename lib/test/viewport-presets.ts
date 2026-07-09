export type ViewportPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  devicePixelRatio: number;
  isMobile: boolean;
  hasTouch: boolean;
  userAgent: string;
};

/** Apple iPhone 17 Air (iPhone Air) — 6.5" portrait CSS viewport. */
export const IPHONE_17_AIR: ViewportPreset = {
  id: "iphone-17-air",
  label: "iPhone 17 Air",
  width: 420,
  height: 912,
  devicePixelRatio: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
};

export const IPHONE_17_AIR_LANDSCAPE: ViewportPreset = {
  ...IPHONE_17_AIR,
  id: "iphone-17-air-landscape",
  label: "iPhone 17 Air Landscape",
  width: 912,
  height: 420,
};

export const DESKTOP_HD: ViewportPreset = {
  id: "desktop-hd",
  label: "Desktop HD",
  width: 1280,
  height: 800,
  devicePixelRatio: 1,
  isMobile: false,
  hasTouch: false,
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export const MOBILE_BREAKPOINT_PX = 768;

export const DEVICE_PRESETS = [IPHONE_17_AIR, IPHONE_17_AIR_LANDSCAPE, DESKTOP_HD] as const;

export function isMobileWidth(width: number): boolean {
  return width < MOBILE_BREAKPOINT_PX;
}