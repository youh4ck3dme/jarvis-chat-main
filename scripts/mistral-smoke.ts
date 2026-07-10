import { readFileSync, existsSync } from "node:fs"

import { formatMistralSmokeResult, runMistralSmoke } from "../lib/ops/mistral-smoke"

function loadDotEnvFile(path: string): void {
  if (!existsSync(path)) return

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

async function main(): Promise<void> {
  loadDotEnvFile(".env.local")

  const result = await runMistralSmoke()
  console.log(formatMistralSmokeResult(result))
  process.exit(result.skipped ? 0 : 0)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})