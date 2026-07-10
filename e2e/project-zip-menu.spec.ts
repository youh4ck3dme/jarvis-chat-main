import { expect, test } from "@playwright/test";

test.describe("Project ZIP export menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 912 });
    await page.goto("/chat");
    await page.waitForSelector('[data-testid="jarvis-empty-state"]', { timeout: 30_000 });
  });

  test("workspace menu shows Export projektu (ZIP)", async ({ page }) => {
    await page.getByRole("button", { name: "Open workspace menu" }).click();
    await expect(page.getByText("Export projektu (ZIP)")).toBeVisible();
    await expect(page.getByText("Sessions + pamäť + build history + posledný HTML")).toBeVisible();
  });
});