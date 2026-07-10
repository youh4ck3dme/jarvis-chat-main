import { defineConfig } from "@playwright/test";

const iPhone17Air = {
  browserName: "chromium" as const,
  viewport: { width: 420, height: 912 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3141",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "iphone-17-air",
      use: { ...iPhone17Air },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3141/chat",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || "ci-placeholder-key",
      BUILDER_UNLOCK_PASSWORD: process.env.BUILDER_UNLOCK_PASSWORD || "2366",
    },
  },
});