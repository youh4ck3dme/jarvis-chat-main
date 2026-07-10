import { expect, test } from "@playwright/test"

test.describe("Attachment upload menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 912 })
    await page.goto("/chat")
    await page.waitForSelector('[data-testid="jarvis-empty-state"]', { timeout: 30_000 })
  })

  test("file input accepts JPEG, HEIC, PNG, WebP, PDF and HTML", async ({ page }) => {
    const accept = await page.locator('input[aria-label="Upload file"]').first().getAttribute("accept")

    expect(accept).toContain(".jpg")
    expect(accept).toContain(".jpeg")
    expect(accept).toContain(".heic")
    expect(accept).toContain(".png")
    expect(accept).toContain(".webp")
    expect(accept).toContain(".pdf")
    expect(accept).toContain(".html")
  })

  test("attachment button exposes supported formats", async ({ page }) => {
    const title = await page.getByRole("button", { name: "Add attachment" }).getAttribute("title")
    expect(title).toContain("JPEG")
    expect(title).toContain("HEIC")
    expect(title).toContain("PDF")
    expect(title).toContain("HTML")
  })
})