import { expect, test } from "@playwright/test";

const VIEWPORT_WIDTH = 420;
const MIN_TOUCH_TARGET = 44;

test.describe("iPhone 17 Air — pixel & layout integrity", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: VIEWPORT_WIDTH, height: 912 });
    await page.goto("/chat");
    await page.waitForSelector('[data-testid="jarvis-empty-state"]', { timeout: 30_000 });
  });

  test("loads workspace without horizontal overflow", async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const root = document.querySelector(".jarvis-workspace") ?? document.body;
      return {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        viewportWidth: window.innerWidth,
      };
    });

    expect(metrics.viewportWidth).toBe(VIEWPORT_WIDTH);
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  });

  test("shows header, mode control, composer and empty state", async ({ page }) => {
    await expect(page.getByTestId("workspace-header")).toBeVisible();
    await expect(page.getByTestId("jarvis-mode-control")).toBeVisible();
    await expect(page.getByTestId("workspace-footer")).toBeVisible();
    await expect(page.getByTestId("jarvis-empty-state")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Message input" })).toBeVisible();
  });

  test("header controls meet minimum touch target size", async ({ page }) => {
    const sizes = await page.evaluate((minTarget) => {
      const selectors = [
        '[aria-label="Open workspace menu"]',
        '[data-testid="jarvis-mode-chat"]',
        '[data-testid="jarvis-mode-builder"]',
        '[aria-label="Open settings"]',
      ];

      return selectors.map((selector) => {
        const element = document.querySelector(selector);
        if (!element) return { selector, ok: false, size: 0 };
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        return { selector, ok: size >= minTarget - 1, size };
      });
    }, MIN_TOUCH_TARGET);

    for (const entry of sizes) {
      expect(entry.ok, `${entry.selector} touch size ${entry.size}px`).toBe(true);
    }
  });

  test("composer stays within viewport bounds", async ({ page }) => {
    const box = await page.getByRole("textbox", { name: "Message input" }).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(VIEWPORT_WIDTH + 1);
  });

  test("empty state story quote fits without clipping", async ({ page }) => {
    const emptyState = page.getByTestId("jarvis-empty-state");
    await expect(emptyState).toBeVisible();

    const fits = await emptyState.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= window.innerWidth + 1;
    });

    expect(fits).toBe(true);
  });

  test("visual snapshot — workspace landing", async ({ page }) => {
    await expect(page).toHaveScreenshot("iphone-17-air-landing.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });
});