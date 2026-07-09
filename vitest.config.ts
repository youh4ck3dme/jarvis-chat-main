import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
    globals: false,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      include: [
        "lib/agents/**/*.ts",
        "lib/build-history/**/*.ts",
        "lib/chat/**/*.ts",
        "lib/api-response.ts",
        "lib/resolve-api-key.ts",
        "lib/default-model.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "**/__fixtures__/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})