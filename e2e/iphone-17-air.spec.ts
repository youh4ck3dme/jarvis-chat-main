import { expect, test } from "@playwright/test"

import {
  assertIphoneLayoutMetrics,
  collectIphoneLayoutMetrics,
  gotoIphoneChatEmptyState,
  IPHONE_17_AIR_VIEWPORT,
  MIN_TOUCH_TARGET,
} from "./helpers/iphone-layout"

test.describe("iPhone 17 Air — pixel & layout integrity", () => {
  test.beforeEach(async ({ page }) => {
    await gotoIphoneChatEmptyState(page)
  })

  test("loads workspace without horizontal overflow", async ({ page }) => {
    const metrics = await collectIphoneLayoutMetrics(page)

    expect(metrics.viewportWidth).toBe(IPHONE_17_AIR_VIEWPORT.width)
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
  })

  test("shows header, mode control, composer and empty state", async ({ page }) => {
    await expect(page.getByTestId("workspace-header")).toBeVisible()
    await expect(page.getByTestId("jarvis-mode-control")).toBeVisible()
    await expect(page.getByTestId("workspace-footer")).toBeVisible()
    await expect(page.getByTestId("jarvis-empty-state")).toBeVisible()
    await expect(page.getByRole("textbox", { name: "Message input" })).toBeVisible()
  })

  test("header controls meet minimum touch target size", async ({ page }) => {
    const metrics = await collectIphoneLayoutMetrics(page)

    for (const target of metrics.touchTargets) {
      expect(target.size, `${target.selector} touch size ${target.size}px`).toBeGreaterThanOrEqual(
        MIN_TOUCH_TARGET - 1,
      )
    }
  })

  test("composer stays within viewport bounds", async ({ page }) => {
    const box = await page.getByRole("textbox", { name: "Message input" }).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(IPHONE_17_AIR_VIEWPORT.width + 1)
  })

  test("empty state story quote fits without clipping", async ({ page }) => {
    const emptyState = page.getByTestId("jarvis-empty-state")
    await expect(emptyState).toBeVisible()

    const fits = await emptyState.evaluate((node) => {
      const rect = node.getBoundingClientRect()
      return rect.left >= 0 && rect.right <= window.innerWidth + 1
    })

    expect(fits).toBe(true)
  })

  test("landing layout — key regions stack without overlap", async ({ page }) => {
    const metrics = await collectIphoneLayoutMetrics(page)
    assertIphoneLayoutMetrics(metrics)
  })
})