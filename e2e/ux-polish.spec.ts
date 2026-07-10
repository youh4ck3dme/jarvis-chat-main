import { expect, test } from "@playwright/test"

test.describe("UX polish (P17)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 912 })
    await page.goto("/chat")
    await page.waitForSelector('[data-testid="jarvis-empty-state"]', { timeout: 30_000 })
  })

  test("menu clarifies new chat does not erase memory or builds", async ({ page }) => {
    await page.getByRole("button", { name: "Open workspace menu" }).click()

    await expect(
      page.getByRole("button", {
        name: /Nový chat.*pamäť a buildy ostávajú v pôvodnom chate/i,
      }),
    ).toBeVisible()
    await expect(page.getByText("Pamäť je per konverzácia — nový chat ju nemaže")).toBeVisible()
    await expect(page.getByText("Buildy viazané na aktuálnu konverzáciu")).toBeVisible()
  })

  test("file input supports multiple attachments", async ({ page }) => {
    const fileInput = page.locator('input[aria-label="Upload file"]').first()
    await expect(fileInput).toHaveAttribute("multiple", "")
  })

  test("composer shows drop overlay on drag enter", async ({ page }) => {
    const dropZone = page.getByTestId("composer-drop-zone")
    await expect(dropZone).toBeVisible()

    await dropZone.dispatchEvent("dragenter", {
      dataTransfer: await page.evaluateHandle(() => {
        const transfer = new DataTransfer()
        transfer.items.add(new File(["demo"], "demo.txt", { type: "text/plain" }))
        return transfer
      }),
    })

    await expect(page.getByText(/Pusti súbory sem/i)).toBeVisible()
  })
})