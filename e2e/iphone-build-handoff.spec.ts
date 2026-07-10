import { expect, test } from "@playwright/test";

const VIEWPORT_WIDTH = 420;
const BUILDER_PASSWORD = process.env.BUILDER_UNLOCK_PASSWORD?.trim() || "223513900";

const SAMPLE_PLAN = {
  success: true,
  data: {
    plan: {
      summary: "Coffee shop landing page",
      sections: ["hero", "menu", "contact"],
      primaryColor: "#111111",
      ctaLabel: "Reserve",
      language: "SK",
      mustHaveScript: true,
    },
    latencyMs: 120,
  },
};

const SAMPLE_HTML = `\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 16px; }
    button { min-height: 48px; padding: 12px 20px; }
    @media (max-width: 768px) { body { padding: 16px; } }
  </style>
</head>
<body>
  <section id="hero"><button>Start</button></section>
  <section id="about"><p>About</p></section>
  <script>document.querySelector("button")?.addEventListener("click", () => {});</script>
</body>
</html>
\`\`\``;

test.describe("iPhone 17 Air — story handoff build flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/build/plan", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SAMPLE_PLAN),
      });
    });

    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: SAMPLE_HTML,
      });
    });

    await page.setViewportSize({ width: VIEWPORT_WIDTH, height: 912 });
    await page.goto("/chat");
    await page.evaluate(() => {
      localStorage.removeItem("jarvis-builder-unlocked");
      localStorage.setItem("jarvis-mode", "chat");
      sessionStorage.setItem("jarvis-story-nudge-shown", "true");
    });
    await page.reload();
    await page.waitForSelector('[data-testid="jarvis-empty-state"]', { timeout: 30_000 });
  });

  test("build intent opens password dialog, verifies server-side, and runs pipeline", async ({
    page,
  }) => {
    const unlockRequests: string[] = [];

    page.on("request", (request) => {
      if (request.url().includes("/api/builder/unlock")) {
        unlockRequests.push(request.url());
      }
    });

    const prompt = "urob mi landing page pre kaviareň";
    await page.getByRole("textbox", { name: "Message input" }).fill(prompt);
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByText(/To znie ako build úloha/i)).toBeVisible();
    await expect(page.getByTestId("builder-password-input")).toBeVisible();

    await page.getByTestId("builder-password-input").fill("wrong-password");
    await page.getByTestId("builder-activate-button").click();
    await expect(page.getByTestId("builder-password-error")).toBeVisible();

    await page.getByTestId("builder-password-input").fill(BUILDER_PASSWORD);
    await page.getByTestId("builder-activate-button").click();

    await expect(page.getByTestId("builder-password-input")).toBeHidden({ timeout: 10_000 });
    expect(unlockRequests.length).toBeGreaterThanOrEqual(2);

    // Mobile workspace auto-switches to artifact view while the pipeline runs.
    await expect(page.getByTestId("storyboard-strip")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Coffee shop landing page/i)).toBeVisible();

    await page.getByRole("button", { name: "Generated Code", exact: true }).click();
    await expect(page.getByText(/section id="hero"/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Back to chat" }).click();
    await expect(page.getByText(prompt).first()).toBeVisible();
    await expect(page.getByText(/rozložím v hlave/i).first()).toBeVisible({
      timeout: 10_000,
    });

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  });

  test("unlocked builder shows storyboard telemetry after handoff on narrow viewport", async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem("jarvis-builder-unlocked", "true");
    });
    await page.reload();
    await page.waitForSelector('[data-testid="jarvis-empty-state"]', { timeout: 30_000 });

    await page.getByRole("textbox", { name: "Message input" }).fill("urob mi landing page pre kaviareň");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByTestId("storyboard-strip")).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: "Live Preview", exact: true }),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Generated Code", exact: true }).click();
    await expect(page.getByText(/section id="hero"/i)).toBeVisible({ timeout: 10_000 });
  });
});