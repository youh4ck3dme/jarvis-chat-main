import { expect, test } from "@playwright/test"

import {
  assertIphoneLayoutMetrics,
  collectIphoneLayoutMetrics,
  gotoIphoneChatEmptyState,
} from "./helpers/iphone-layout"

/**
 * Cross-platform layout regression without pixel screenshots.
 * JSON metrics are identical on Linux CI and macOS dev — no darwin/linux PNG drift.
 */
test.describe("iPhone 17 Air — layout snapshot (cross-platform)", () => {
  test("landing layout metrics match committed baseline", async ({ page }) => {
    await gotoIphoneChatEmptyState(page)

    const metrics = await collectIphoneLayoutMetrics(page)
    assertIphoneLayoutMetrics(metrics)
    await expect(JSON.stringify(metrics, null, 2)).toMatchSnapshot("landing-layout-metrics.txt")
  })
})