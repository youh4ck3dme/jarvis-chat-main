import { expect, test } from "@playwright/test"

import { gotoIphoneChatEmptyState } from "./helpers/iphone-layout"
import {
  assertIphonePixelPerfectMetrics,
  collectIphonePixelPerfectMetrics,
  PIXEL_TOLERANCE,
} from "./helpers/iphone-pixel-perfect"

/**
 * Zakerný pixel-perfect UI/UX audit pre iPhone 17 Air.
 * Overuje rovnomerné rozloženie, symetriu a nulové medzery medzi regiónmi.
 */
test.describe("iPhone 17 Air — pixel-perfect UI/UX audit", () => {
  test.beforeEach(async ({ page }) => {
    await gotoIphoneChatEmptyState(page)
    await page.waitForFunction(
      () => {
        const footer = document.querySelector('[data-testid="workspace-footer"]')
        const composer = document.querySelector(".jarvis-composer-shell")
        if (!footer || !composer) return false
        const footerRect = footer.getBoundingClientRect()
        const composerRect = composer.getBoundingClientRect()
        return (
          Math.round(footerRect.bottom) === window.innerHeight &&
          Math.round(composerRect.left) === 0 &&
          Math.round(composerRect.width) === window.innerWidth
        )
      },
      undefined,
      { timeout: 15_000 },
    )
  })

  test("landing layout is pixel-even: stack, symmetry, uniform controls", async ({ page }) => {
    const metrics = await collectIphonePixelPerfectMetrics(page)
    assertIphonePixelPerfectMetrics(metrics)
  })

  test("pixel-perfect metrics match committed baseline (±1px stable JSON)", async ({ page }) => {
    const metrics = await collectIphonePixelPerfectMetrics(page)
    assertIphonePixelPerfectMetrics(metrics)
    await expect(JSON.stringify(metrics, null, 2)).toMatchSnapshot("pixel-perfect-metrics.txt")
  })

  test("composer shell stays locked to viewport bottom after keyboard-dismiss reflow", async ({
    page,
  }) => {
    const input = page.getByRole("textbox", { name: "Message input" })
    await input.click()
    await input.fill("pixel test")
    await page.keyboard.press("Escape")
    await page.waitForTimeout(150)

    const metrics = await collectIphonePixelPerfectMetrics(page)
    expect(metrics.composerShell.bottom).toBe(metrics.viewport.height)
    expect(metrics.composerShell.left).toBe(0)
    expect(metrics.composerShell.width).toBe(metrics.viewport.width)
    expect(metrics.symmetry.composerShellPaddingDelta).toBeLessThanOrEqual(PIXEL_TOLERANCE)
  })
})