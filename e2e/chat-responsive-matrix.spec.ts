import { expect, test } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

import {
  collectMatrixMetrics,
  gotoSeededChat,
  RESPONSIVE_MATRIX,
  seedChatWithMessages,
} from "./helpers/chat-responsive-matrix"
import { IPHONE_14, DESKTOP_FHD, DESKTOP_HD } from "@/lib/test/viewport-presets"

const SCREENSHOT_DIR = path.join("test-results", "screenshots")

test.describe("Chat responsive matrix — pixel-perfect audit", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 })

  test.beforeEach(async ({ page }) => {
    await seedChatWithMessages(page, 12)
  })

  for (const preset of RESPONSIVE_MATRIX) {
    test(`matrix ${preset.label} (${preset.width}x${preset.height}): no overflow, composer above last message`, async ({
      page,
    }, testInfo) => {
      await gotoSeededChat(page, preset.width, preset.height)

      await expect(page.getByText("User message 1:", { exact: false }).first()).toBeVisible({
        timeout: 30_000,
      })
      await expect(page.getByTestId("message-bubble").first()).toBeVisible({ timeout: 15_000 })

      const metrics = await collectMatrixMetrics(page)

      expect(metrics.viewport.width).toBe(preset.width)
      expect(metrics.viewport.height).toBe(preset.height)
      expect(metrics.header).not.toBeNull()
      expect(metrics.footer).not.toBeNull()
      expect(metrics.composer).not.toBeNull()
      expect(metrics.lastMessage).not.toBeNull()

      // Footer / composer locked to viewport bottom (safe-area is 0 in Chromium)
      expect(metrics.footer!.bottom).toBe(metrics.viewport.height)

      // No horizontal overflow on workspace
      expect(metrics.workspaceScrollWidth).toBeLessThanOrEqual(metrics.workspaceClientWidth + 1)

      // Header 1px-aligned with left edge (safe-area 0 in Chromium)
      expect(metrics.header!.left).toBeGreaterThanOrEqual(0)
      expect(metrics.header!.left).toBeLessThanOrEqual(1)

      // Composer never covers the last message after scroll-to-bottom
      expect(metrics.lastMessage!.bottom).toBeLessThanOrEqual(metrics.composer!.top + 2)

      if (preset.id === IPHONE_14.id || preset.id === DESKTOP_FHD.id) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
        const filePath = path.join(SCREENSHOT_DIR, `matrix-${preset.id}-after.png`)
        await page.screenshot({ path: filePath, fullPage: false })
        await testInfo.attach(`matrix-${preset.id}-after`, {
          path: filePath,
          contentType: "image/png",
        })
      }
    })
  }

  test("fake keyboard at 390x844 keeps composer stuck to viewport bottom", async ({ page }) => {
    await gotoSeededChat(page, IPHONE_14.width, IPHONE_14.height)
    await expect(page.getByTestId("message-bubble").first()).toBeVisible({ timeout: 30_000 })

    const before = await collectMatrixMetrics(page)
    expect(before.footer!.bottom).toBe(IPHONE_14.height)

    const client = await page.context().newCDPSession(page)
    // Simulate software keyboard by shrinking layout viewport height (~half)
    const keyboardHeight = 390
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: IPHONE_14.width,
      height: keyboardHeight,
      deviceScaleFactor: 3,
      mobile: true,
    })

    await page.waitForTimeout(250)

    const during = await collectMatrixMetrics(page)
    expect(during.viewport.height).toBe(keyboardHeight)
    expect(during.composer!.bottom).toBe(keyboardHeight)
    expect(during.footer!.bottom).toBe(keyboardHeight)
    expect(during.lastMessage).not.toBeNull()
    expect(during.lastMessage!.bottom).toBeLessThanOrEqual(during.composer!.top + 2)

    // Restore full viewport
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: IPHONE_14.width,
      height: IPHONE_14.height,
      deviceScaleFactor: 3,
      mobile: true,
    })
    await page.waitForTimeout(250)

    const after = await collectMatrixMetrics(page)
    expect(after.viewport.height).toBe(IPHONE_14.height)
    expect(after.composer!.bottom).toBe(IPHONE_14.height)
  })

  test("desktop min chat panel (28%) keeps composer controls visible without horizontal scroll", async ({
    page,
  }) => {
    await gotoSeededChat(page, DESKTOP_HD.width, DESKTOP_HD.height)
    await expect(page.getByTestId("message-bubble").first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("chat-resize-handle")).toBeVisible({ timeout: 15_000 })

    const handle = page.getByTestId("chat-resize-handle")
    const box = await handle.boundingBox()
    expect(box).not.toBeNull()

    // Drag handle left to force chat panel toward minSize (28%)
    const startX = box!.x + box!.width / 2
    const startY = box!.y + box!.height / 2
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(Math.max(80, startX - 520), startY, { steps: 24 })
    await page.mouse.up()
    await page.waitForTimeout(200)

    const metrics = await collectMatrixMetrics(page)
    expect(metrics.composerScrollWidth).toBeLessThanOrEqual(metrics.composerClientWidth + 1)

    const controls = [
      page.getByRole("button", { name: "Add attachment" }),
      page.getByRole("button", { name: "More options" }),
      page.getByRole("button", { name: "Send message" }),
    ]

    const panelLeft = metrics.composer!.left
    const panelRight = metrics.composer!.right

    for (const control of controls) {
      await expect(control).toBeVisible()
      const rect = await control.boundingBox()
      expect(rect).not.toBeNull()
      expect(rect!.x).toBeGreaterThanOrEqual(panelLeft - 1)
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(panelRight + 1)
    }
  })
})
