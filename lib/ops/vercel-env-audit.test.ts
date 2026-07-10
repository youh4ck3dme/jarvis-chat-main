import { describe, expect, it, vi } from "vitest"

import {
  auditEnvExampleFile,
  auditLiveProductionProbes,
  auditManifestAgainstCoverage,
  buildCoverageMatrix,
  formatAuditReport,
  parseVercelEnvJson,
  runVercelEnvAudit,
  type AuditFinding,
} from "./vercel-env-audit"
import { parseEnvExampleKeys } from "./vercel-env-manifest"

describe("vercel-env-audit", () => {
  it("parses vercel env json and merges targets per key", () => {
    const records = parseVercelEnvJson({
      envs: [
        { key: "MISTRAL_API_KEY", target: ["production"] },
        { key: "MISTRAL_API_KEY", target: ["development"] },
        { key: "BUILDER_UNLOCK_PASSWORD", target: ["production", "preview", "development"] },
      ],
    })

    expect(records).toEqual([
      { key: "BUILDER_UNLOCK_PASSWORD", targets: ["development", "preview", "production"] },
      { key: "MISTRAL_API_KEY", targets: ["development", "production"] },
    ])
  })

  it("flags missing required env on preview", () => {
    const findings: AuditFinding[] = []
    auditManifestAgainstCoverage(
      buildCoverageMatrix([
        { key: "MISTRAL_API_KEY", targets: ["production", "development"] },
        { key: "BUILDER_UNLOCK_PASSWORD", targets: ["production", "preview", "development"] },
      ]),
      findings,
    )

    expect(findings.some((finding) => finding.code === "ENV_MISSING" && finding.message.includes("preview"))).toBe(
      true,
    )
  })

  it("warns when supabase is only partially configured", () => {
    const findings: AuditFinding[] = []
    auditManifestAgainstCoverage(
      buildCoverageMatrix([{ key: "SUPABASE_URL", targets: ["production"] }]),
      findings,
    )

    expect(findings.some((finding) => finding.code === "SUPABASE_PARTIAL")).toBe(true)
  })

  it("parses .env.example keys", () => {
    const keys = parseEnvExampleKeys(`
# comment
MISTRAL_API_KEY=
BUILDER_UNLOCK_PASSWORD=223513900
`)
    expect(keys).toEqual(["BUILDER_UNLOCK_PASSWORD", "MISTRAL_API_KEY"])
  })

  it("detects live builder unlock misconfiguration via probes", async () => {
    const findings: AuditFinding[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/api/builder/unlock")) {
        return new Response(JSON.stringify({ success: false, error: "missing" }), { status: 503 })
      }
      return new Response(JSON.stringify({ success: true, data: { enabled: false } }), { status: 200 })
    })

    await auditLiveProductionProbes("https://example.com", findings, fetchMock as typeof fetch)

    expect(findings.some((finding) => finding.code === "LIVE_BUILDER_UNLOCK_MISSING")).toBe(true)
  })

  it("formats an audit report summary", async () => {
    const report = await runVercelEnvAudit({
      vercelEnvs: [
        { key: "MISTRAL_API_KEY", targets: ["production", "preview", "development"] },
        { key: "BUILDER_UNLOCK_PASSWORD", targets: ["production", "preview", "development"] },
      ],
      envExamplePath: "/dev/null",
      runLiveProbes: false,
    })

    const formatted = formatAuditReport(report)
    expect(formatted).toContain("Jarvis Vercel env audit")
    expect(formatted).toContain("production:")
  })

  it("flags undocumented keys in env example audit helper", () => {
    const findings: AuditFinding[] = []
    auditEnvExampleFile(["MISTRAL_API_KEY", "CUSTOM_UNKNOWN_KEY"], findings)
    expect(findings.some((finding) => finding.code === "ENV_EXAMPLE_UNDOCUMENTED")).toBe(true)
  })
})