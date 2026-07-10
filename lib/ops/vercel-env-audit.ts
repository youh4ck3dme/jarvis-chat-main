import { readFileSync } from "node:fs"
import path from "node:path"

import {
  JARVIS_VERCEL_ENV_RULES,
  JARVIS_VERCEL_PROJECT,
  parseEnvExampleKeys,
  SECRETS_THAT_MUST_NOT_BE_PUBLIC,
  SUPABASE_ENV_KEYS,
  type EnvRequirement,
  type VercelEnvTarget,
} from "./vercel-env-manifest"

export type AuditSeverity = "error" | "warn" | "info"

export type AuditFinding = {
  severity: AuditSeverity
  code: string
  message: string
}

export type VercelEnvRecord = {
  key: string
  targets: VercelEnvTarget[]
}

export type EnvCoverageMatrix = Record<VercelEnvTarget, Set<string>>

export type VercelEnvAuditReport = {
  generatedAt: string
  productionUrl: string
  findings: AuditFinding[]
  coverage: Record<VercelEnvTarget, string[]>
  ok: boolean
}

export type VercelEnvAuditOptions = {
  productionUrl?: string
  envExamplePath?: string
  vercelEnvs?: VercelEnvRecord[]
  runLiveProbes?: boolean
  fetchImpl?: typeof fetch
}

type VercelEnvJson = {
  envs?: Array<{
    key?: string
    target?: string[]
  }>
}

const TARGETS: VercelEnvTarget[] = ["production", "preview", "development"]

function emptyCoverage(): EnvCoverageMatrix {
  return {
    production: new Set<string>(),
    preview: new Set<string>(),
    development: new Set<string>(),
  }
}

export function parseVercelEnvJson(payload: VercelEnvJson): VercelEnvRecord[] {
  const merged = new Map<string, Set<VercelEnvTarget>>()

  for (const entry of payload.envs ?? []) {
    const key = entry.key?.trim()
    if (!key) continue

    const bucket = merged.get(key) ?? new Set<VercelEnvTarget>()
    for (const target of entry.target ?? []) {
      if (target === "production" || target === "preview" || target === "development") {
        bucket.add(target)
      }
    }
    merged.set(key, bucket)
  }

  return [...merged.entries()]
    .map(([key, targets]) => ({ key, targets: [...targets].sort() }))
    .sort((left, right) => left.key.localeCompare(right.key))
}

export function buildCoverageMatrix(records: VercelEnvRecord[]): EnvCoverageMatrix {
  const matrix = emptyCoverage()

  for (const record of records) {
    for (const target of record.targets) {
      matrix[target].add(record.key)
    }
  }

  return matrix
}

function addFinding(
  findings: AuditFinding[],
  severity: AuditSeverity,
  code: string,
  message: string,
): void {
  findings.push({ severity, code, message })
}

function requirementLabel(requirement: EnvRequirement): string {
  return requirement === "required" ? "required" : requirement
}

export function auditManifestAgainstCoverage(
  coverage: EnvCoverageMatrix,
  findings: AuditFinding[],
): void {
  for (const rule of JARVIS_VERCEL_ENV_RULES) {
    if (rule.requirement === "optional") continue

    for (const target of rule.targets) {
      if (!coverage[target].has(rule.key)) {
        addFinding(
          findings,
          rule.requirement === "required" ? "error" : "warn",
          rule.requirement === "required" ? "ENV_MISSING" : "ENV_RECOMMENDED_MISSING",
          `${rule.key} is ${requirementLabel(rule.requirement)} on ${target} (${rule.description})`,
        )
      }
    }
  }

  const supabasePresent = SUPABASE_ENV_KEYS.some((key) =>
    TARGETS.some((target) => coverage[target].has(key)),
  )

  if (supabasePresent) {
    for (const key of SUPABASE_ENV_KEYS) {
      for (const target of TARGETS) {
        if (!coverage[target].has(key)) {
          addFinding(
            findings,
            "warn",
            "SUPABASE_PARTIAL",
            `Supabase is partially configured: missing ${key} on ${target}`,
          )
        }
      }
    }
  }

  for (const target of TARGETS) {
    for (const key of coverage[target]) {
      if (key.startsWith("NEXT_PUBLIC_")) {
        const bareKey = key.slice("NEXT_PUBLIC_".length)
        if (
          (SECRETS_THAT_MUST_NOT_BE_PUBLIC as readonly string[]).includes(bareKey) ||
          key.includes("BUILDER_UNLOCK_PASSWORD")
        ) {
          addFinding(
            findings,
            "error",
            "FORBIDDEN_PUBLIC_SECRET",
            `${key} must not be exposed via NEXT_PUBLIC_ on ${target}`,
          )
        }
      }
    }

    if (coverage[target].has("BUILDER_UNLOCK_RATE_LIMIT_DISABLED")) {
      addFinding(
        findings,
        "warn",
        "RATE_LIMIT_DISABLED",
        `BUILDER_UNLOCK_RATE_LIMIT_DISABLED is set on ${target} — use only for dev/test`,
      )
    }
  }
}

export function auditEnvExampleFile(
  exampleKeys: string[],
  findings: AuditFinding[],
): void {
  const manifestKeys = new Set(JARVIS_VERCEL_ENV_RULES.map((rule) => rule.key))

  for (const key of exampleKeys) {
    if (key.startsWith("NEXT_PUBLIC_BUILDER_UNLOCK")) {
      addFinding(findings, "error", "FORBIDDEN_EXAMPLE_KEY", `${key} must not appear in .env.example`)
    }
  }

  for (const rule of JARVIS_VERCEL_ENV_RULES) {
    if (rule.requirement === "optional") continue
    if (!exampleKeys.includes(rule.key)) {
      addFinding(
        findings,
        rule.requirement === "required" ? "warn" : "info",
        "ENV_EXAMPLE_MISSING",
        `${rule.key} is missing from .env.example (${rule.description})`,
      )
    }
  }

  for (const key of exampleKeys) {
    if (!manifestKeys.has(key) && !key.startsWith("PORT")) {
      addFinding(
        findings,
        "info",
        "ENV_EXAMPLE_UNDOCUMENTED",
        `${key} exists in .env.example but is not in the ops manifest`,
      )
    }
  }
}

async function probeBuilderUnlock(
  baseUrl: string,
  password: string,
  fetchImpl: typeof fetch,
): Promise<{ status: number; body: unknown }> {
  const response = await fetchImpl(`${baseUrl}/api/builder/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  })

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  return { status: response.status, body }
}

export async function auditLiveProductionProbes(
  baseUrl: string,
  findings: AuditFinding[],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const wrongPassword = await probeBuilderUnlock(baseUrl, "audit-wrong-password", fetchImpl)

  if (wrongPassword.status === 503) {
    addFinding(
      findings,
      "error",
      "LIVE_BUILDER_UNLOCK_MISSING",
      "Production /api/builder/unlock returns 503 — BUILDER_UNLOCK_PASSWORD missing on Vercel Production",
    )
    return
  }

  if (wrongPassword.status !== 401) {
    addFinding(
      findings,
      "warn",
      "LIVE_BUILDER_UNLOCK_UNEXPECTED",
      `Production /api/builder/unlock returned ${wrongPassword.status} for invalid password (expected 401)`,
    )
  } else {
    addFinding(
      findings,
      "info",
      "LIVE_BUILDER_UNLOCK_CONFIGURED",
      "Production builder unlock is configured (invalid password rejected with 401)",
    )
  }

  const legacyPassword = await probeBuilderUnlock(baseUrl, "2366", fetchImpl)
  if (legacyPassword.status === 200) {
    addFinding(
      findings,
      "error",
      "LIVE_LEGACY_PASSWORD_ACTIVE",
      "Production still accepts legacy builder password 2366 — rotate BUILDER_UNLOCK_PASSWORD",
    )
  }

  try {
    const statusResponse = await fetchImpl(`${baseUrl}/api/sessions/sync/status`)
    if (!statusResponse.ok) {
      addFinding(
        findings,
        "warn",
        "LIVE_SYNC_STATUS_FAILED",
        `GET /api/sessions/sync/status returned ${statusResponse.status}`,
      )
      return
    }

    const payload = (await statusResponse.json()) as {
      success?: boolean
      data?: { enabled?: boolean; authConfigured?: boolean }
    }

    if (payload.data?.enabled && payload.data.authConfigured) {
      addFinding(
        findings,
        "info",
        "LIVE_SUPABASE_READY",
        "Production Supabase sync + auth endpoints report configured",
      )
    } else if (payload.data?.enabled && !payload.data.authConfigured) {
      addFinding(
        findings,
        "warn",
        "LIVE_SUPABASE_PARTIAL",
        "Production sync enabled but auth is not fully configured (check NEXT_PUBLIC_SUPABASE_*)",
      )
    }
  } catch (error) {
    addFinding(
      findings,
      "warn",
      "LIVE_SYNC_STATUS_ERROR",
      `Failed to probe /api/sessions/sync/status: ${error instanceof Error ? error.message : "unknown error"}`,
    )
  }
}

export async function fetchVercelProjectEnvs(options: {
  token: string
  projectId?: string
  teamId?: string
  fetchImpl?: typeof fetch
}): Promise<VercelEnvRecord[]> {
  const projectId = options.projectId ?? JARVIS_VERCEL_PROJECT.projectId
  const teamId = options.teamId ?? JARVIS_VERCEL_PROJECT.teamId
  const fetchImpl = options.fetchImpl ?? fetch

  const url = new URL(`https://api.vercel.com/v9/projects/${projectId}/env`)
  url.searchParams.set("teamId", teamId)

  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${options.token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Vercel env API failed (${response.status})`)
  }

  const payload = (await response.json()) as VercelEnvJson
  return parseVercelEnvJson(payload)
}

export async function runVercelEnvAudit(
  options: VercelEnvAuditOptions = {},
): Promise<VercelEnvAuditReport> {
  const findings: AuditFinding[] = []
  const productionUrl = options.productionUrl ?? JARVIS_VERCEL_PROJECT.productionUrl
  const fetchImpl = options.fetchImpl ?? fetch

  let records = options.vercelEnvs ?? []
  if (records.length === 0 && process.env.VERCEL_TOKEN?.trim()) {
    try {
      records = await fetchVercelProjectEnvs({
        token: process.env.VERCEL_TOKEN.trim(),
        fetchImpl,
      })
      addFinding(findings, "info", "VERCEL_API_OK", `Loaded ${records.length} env keys from Vercel API`)
    } catch (error) {
      addFinding(
        findings,
        "warn",
        "VERCEL_API_FAILED",
        `Could not load Vercel env via API: ${error instanceof Error ? error.message : "unknown error"}`,
      )
    }
  } else if (records.length > 0) {
    addFinding(findings, "info", "VERCEL_ENV_INPUT", `Auditing ${records.length} env keys from input`)
  } else {
    addFinding(
      findings,
      "warn",
      "VERCEL_API_SKIPPED",
      "VERCEL_TOKEN not set — skipping remote env matrix audit (live probes still run)",
    )
  }

  const examplePath = options.envExamplePath ?? path.join(process.cwd(), ".env.example")
  try {
    const exampleContents = readFileSync(examplePath, "utf8")
    auditEnvExampleFile(parseEnvExampleKeys(exampleContents), findings)
  } catch (error) {
    addFinding(
      findings,
      "warn",
      "ENV_EXAMPLE_READ_FAILED",
      `Could not read .env.example: ${error instanceof Error ? error.message : "unknown error"}`,
    )
  }

  if (records.length > 0) {
    auditManifestAgainstCoverage(buildCoverageMatrix(records), findings)
  }

  if (options.runLiveProbes !== false) {
    await auditLiveProductionProbes(productionUrl, findings, fetchImpl)
  }

  const coverageMatrix =
    records.length > 0 ? buildCoverageMatrix(records) : emptyCoverage()

  const ok = !findings.some((finding) => finding.severity === "error")

  return {
    generatedAt: new Date().toISOString(),
    productionUrl,
    findings,
    coverage: {
      production: [...coverageMatrix.production].sort(),
      preview: [...coverageMatrix.preview].sort(),
      development: [...coverageMatrix.development].sort(),
    },
    ok,
  }
}

export function formatAuditReport(report: VercelEnvAuditReport): string {
  const lines: string[] = [
    `Jarvis Vercel env audit — ${report.generatedAt}`,
    `Production: ${report.productionUrl}`,
    `Status: ${report.ok ? "OK" : "FAILED"}`,
    "",
  ]

  if (report.coverage.production.length > 0) {
    lines.push("Coverage:")
    for (const target of TARGETS) {
      const keys = report.coverage[target]
      lines.push(`  ${target}: ${keys.length ? keys.join(", ") : "(none)"}`)
    }
    lines.push("")
  }

  const grouped = {
    error: report.findings.filter((finding) => finding.severity === "error"),
    warn: report.findings.filter((finding) => finding.severity === "warn"),
    info: report.findings.filter((finding) => finding.severity === "info"),
  }

  for (const severity of ["error", "warn", "info"] as const) {
    if (grouped[severity].length === 0) continue
    lines.push(`${severity.toUpperCase()}:`)
    for (const finding of grouped[severity]) {
      lines.push(`  [${finding.code}] ${finding.message}`)
    }
    lines.push("")
  }

  return lines.join("\n").trimEnd()
}