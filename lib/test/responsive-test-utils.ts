import { expect, vi } from "vitest";

import { isMobileWidth, type ViewportPreset } from "./viewport-presets";

const MIN_TOUCH_TARGET_PX = 44;

export function evaluateMediaQuery(query: string, preset: ViewportPreset): boolean {
  const normalized = query.replace(/\s+/g, "");

  const maxWidth = normalized.match(/\(max-width:(\d+(?:\.\d+)?)px\)/);
  if (maxWidth) {
    return preset.width <= Number(maxWidth[1]);
  }

  const minWidth = normalized.match(/\(min-width:(\d+(?:\.\d+)?)px\)/);
  if (minWidth) {
    return preset.width >= Number(minWidth[1]);
  }

  const maxHeight = normalized.match(/\(max-height:(\d+(?:\.\d+)?)px\)/);
  if (maxHeight) {
    return preset.height <= Number(maxHeight[1]);
  }

  const minHeight = normalized.match(/\(min-height:(\d+(?:\.\d+)?)px\)/);
  if (minHeight) {
    return preset.height >= Number(minHeight[1]);
  }

  if (normalized.includes("(orientation:portrait)")) {
    return preset.height >= preset.width;
  }

  if (normalized.includes("(orientation:landscape)")) {
    return preset.width >= preset.height;
  }

  if (normalized.includes("(-webkit-min-device-pixel-ratio:3)")) {
    return preset.devicePixelRatio >= 3;
  }

  return false;
}

export function setTestViewport(preset: ViewportPreset): void {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: preset.width,
  });
  Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: preset.height,
  });
  Object.defineProperty(window, "outerWidth", {
    writable: true,
    configurable: true,
    value: preset.width,
  });
  Object.defineProperty(window, "outerHeight", {
    writable: true,
    configurable: true,
    value: preset.height,
  });
  Object.defineProperty(window, "devicePixelRatio", {
    writable: true,
    configurable: true,
    value: preset.devicePixelRatio,
  });

  const matchMedia = vi.fn().mockImplementation((query: string) => {
    const matches = evaluateMediaQuery(query, preset);
    const listeners: Array<() => void> = [];

    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_: string, handler: () => void) => {
        listeners.push(handler);
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: matchMedia,
  });
}

export function assertNoHorizontalOverflow(container: HTMLElement, viewportWidth: number): void {
  const overflow = container.scrollWidth - viewportWidth;
  expect(overflow).toBeLessThanOrEqual(1);
}

export function collectInteractiveElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button, a[href], input, textarea, select, [role="button"], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
}

export function assertMinTouchTargets(
  root: HTMLElement,
  minSize = MIN_TOUCH_TARGET_PX,
): void {
  const interactive = collectInteractiveElements(root);

  for (const element of interactive) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") continue;
    if (rect.width === 0 && rect.height === 0) continue;

    expect(
      Math.max(rect.width, rect.height),
      `Touch target too small: ${element.getAttribute("aria-label") ?? element.tagName}`,
    ).toBeGreaterThanOrEqual(minSize - 1);
  }
}

export function mockElementRects(root: HTMLElement, defaultSize = MIN_TOUCH_TARGET_PX): void {
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];

  for (const element of elements) {
    element.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      width: defaultSize,
      height: defaultSize,
      top: 0,
      left: 0,
      right: defaultSize,
      bottom: defaultSize,
      toJSON: () => ({}),
    });
  }

  Object.defineProperty(root, "scrollWidth", {
    configurable: true,
    get: () => window.innerWidth,
  });
  Object.defineProperty(root, "clientWidth", {
    configurable: true,
    get: () => window.innerWidth,
  });
}

export function expectMobileLayoutActive(preset: ViewportPreset): void {
  expect(isMobileWidth(preset.width)).toBe(true);
  expect(window.matchMedia("(max-width: 767px)").matches).toBe(true);
}