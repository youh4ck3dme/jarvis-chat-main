import { readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

import {
  buildProjectUrl,
  loadEnvLocalFile,
  parseLinearBacklog,
  parseLinearConfig,
  validateLinearBacklog,
} from "./linear-backlog-sync"

const root = resolve(__dirname, "../..")

describe("linear-backlog-sync", () => {
  it("validates committed linear-backlog.json", () => {
    const backlog = parseLinearBacklog(
      readFileSync(resolve(root, "scripts/linear-backlog.json"), "utf-8"),
    )
    expect(backlog.issues.length).toBeGreaterThanOrEqual(15)
    expect(backlog.projectName).toBe("JARVIS")
  })

  it("validates linear.config.json urls", () => {
    const config = parseLinearConfig(
      readFileSync(resolve(root, "scripts/linear.config.json"), "utf-8"),
    )
    expect(config.teamKey).toBe("YOU")
    expect(config.workspaceUrl).toContain("linear.app")
    expect(buildProjectUrl(config, "JARVIS")).toContain("/team/YOU/project/")
  })

  it("rejects duplicate backlog titles", () => {
    expect(() =>
      validateLinearBacklog({
        projectName: "JARVIS",
        issues: [
          { title: "A", description: "one" },
          { title: "A", description: "two" },
        ],
      }),
    ).toThrow(/duplicate title/)
  })

  it("parses .env.local style key=value lines", () => {
    const envPath = join(tmpdir(), `jarvis-linear-env-${Date.now()}.env`)
    writeFileSync(
      envPath,
      ["# comment", "LINEAR_TEAM_KEY=YOU", 'LINEAR_API_KEY="lin_api_x"'].join("\n"),
      "utf-8",
    )
    try {
      const parsed = loadEnvLocalFile(envPath)
      expect(parsed.LINEAR_TEAM_KEY).toBe("YOU")
      expect(parsed.LINEAR_API_KEY).toBe("lin_api_x")
    } finally {
      unlinkSync(envPath)
    }
  })
})