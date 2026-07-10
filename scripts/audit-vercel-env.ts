import { execSync } from "node:child_process"
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

function parseVercelCliJsonOutput(raw: string): VercelEnvRecord[] {
  const jsonStart = raw.indexOf("{")
  if (jsonStart === -1) {
    throw new Error("No JSON payload found in Vercel CLI output")
  }
  return parseVercelEnvJson(JSON.parse(raw.slice(jsonStart)))
}

function loadVercelEnvJson(path: string): VercelEnvRecord[] {
  return parseVercelCliJsonOutput(readFileSync(path, "utf8"))
}

function loadVercelEnvsFromCli(): VercelEnvRecord[] {
  const raw = execSync("vercel env list --format json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  return parseVercelCliJsonOutput(raw)
}

async function main(): Promise<void> {
  const vercelEnvJsonPath = readArg("--vercel-env-json")
  const useVercelCli = process.argv.includes("--from-vercel-cli")

  let vercelEnvs: VercelEnvRecord[] | undefined
  if (vercelEnvJsonPath) {
    vercelEnvs = loadVercelEnvJson(vercelEnvJsonPath)
  } else if (useVercelCli || process.env.AUDIT_FROM_VERCEL_CLI === "1") {
    vercelEnvs = loadVercelEnvsFromCli()
  }

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