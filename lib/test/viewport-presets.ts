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

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Classic iPhone SE — narrowest common production width. */
export const IPHONE_SE: ViewportPreset = {
  id: "iphone-se",
  label: "iPhone SE",
  width: 320,
  height: 568,
  devicePixelRatio: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: IPHONE_UA,
};

/** iPhone 14 — common mid-size phone. */
export const IPHONE_14: ViewportPreset = {
  id: "iphone-14",
  label: "iPhone 14",
  width: 390,
  height: 844,
  devicePixelRatio: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: IPHONE_UA,
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
  userAgent: IPHONE_UA,
};

/** iPhone 14/15/16 Pro Max class. */
export const IPHONE_PRO_MAX: ViewportPreset = {
  id: "iphone-pro-max",
  label: "iPhone Pro Max",
  width: 430,
  height: 932,
  devicePixelRatio: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: IPHONE_UA,
};

export const IPHONE_17_AIR_LANDSCAPE: ViewportPreset = {
  ...IPHONE_17_AIR,
  id: "iphone-17-air-landscape",
  label: "iPhone 17 Air Landscape",
  width: 912,
  height: 420,
};

/** Tablet / md breakpoint edge. */
export const TABLET: ViewportPreset = {
  id: "tablet",
  label: "Tablet",
  width: 768,
  height: 1024,
  devicePixelRatio: 2,
  isMobile: false,
  hasTouch: true,
  userAgent: DESKTOP_UA,
};

export const DESKTOP_HD: ViewportPreset = {
  id: "desktop-hd",
  label: "Desktop HD",
  width: 1280,
  height: 800,
  devicePixelRatio: 1,
  isMobile: false,
  hasTouch: false,
  userAgent: DESKTOP_UA,
};

export const DESKTOP_FHD: ViewportPreset = {
  id: "desktop-fhd",
  label: "Desktop FHD",
  width: 1920,
  height: 1080,
  devicePixelRatio: 1,
  isMobile: false,
  hasTouch: false,
  userAgent: DESKTOP_UA,
};

export const MOBILE_BREAKPOINT_PX = 768;

/** Full responsive matrix used by integrity + e2e audits. */
export const DEVICE_PRESETS = [
  IPHONE_SE,
  IPHONE_14,
  IPHONE_17_AIR,
  IPHONE_PRO_MAX,
  IPHONE_17_AIR_LANDSCAPE,
  TABLET,
  DESKTOP_HD,
  DESKTOP_FHD,
] as const;

/** Playwright / visual matrix (no landscape duplicate). */
export const RESPONSIVE_MATRIX = [
  IPHONE_SE,
  IPHONE_14,
  IPHONE_PRO_MAX,
  TABLET,
  DESKTOP_HD,
  DESKTOP_FHD,
] as const;

export function isMobileWidth(width: number): boolean {
  return width < MOBILE_BREAKPOINT_PX;
}
