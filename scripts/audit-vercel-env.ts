import { readFileSync } from "node:fs"

import {
  formatAuditReport,
  parseVercelEnvJson,
  runVercelEnvAudit,
  type VercelEnvRecord,
} from "../lib/ops/vercel-env-audit"

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

function loadVercelEnvJson(path: string): VercelEnvRecord[] {
  const raw = readFileSync(path, "utf8")
  const jsonStart = raw.indexOf("{")
  if (jsonStart === -1) {
    throw new Error(`No JSON payload found in ${path}`)
  }
  return parseVercelEnvJson(JSON.parse(raw.slice(jsonStart)))
}

async function main(): Promise<void> {
  const vercelEnvJsonPath = readArg("--vercel-env-json")
  const vercelEnvs = vercelEnvJsonPath ? loadVercelEnvJson(vercelEnvJsonPath) : undefined

  const report = await runVercelEnvAudit({
    productionUrl: process.env.JARVIS_AUDIT_BASE_URL,
    vercelEnvs,
    runLiveProbes: process.env.SKIP_LIVE_PROBES !== "1" && !process.argv.includes("--skip-live"),
  })

  console.log(formatAuditReport(report))
  process.exit(report.ok ? 0 : 1)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})