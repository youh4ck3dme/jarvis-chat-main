import { readFileSync } from "node:fs"
import { resolve } from "node:path"

export type LinearBacklogIssue = {
  title: string
  description: string
  priority?: number
  labels?: string[]
}

export type LinearBacklogFile = {
  projectName: string
  projectDescription?: string
  issues: LinearBacklogIssue[]
}

export type LinearConfig = {
  workspaceSlug: string
  teamKey: string
  projectName: string
  workspaceUrl: string
  teamUrl: string
  apiSettingsUrl: string
}

export const LINEAR_API = "https://api.linear.app/graphql"

export function loadEnvLocalFile(envPath: string): Record<string, string> {
  const loaded: Record<string, string> = {}
  try {
    const content = readFileSync(envPath, "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue
      const [key, ...rest] = trimmed.split("=")
      const raw = rest.join("=").trim()
      const value = raw.replace(/^["']|["']$/g, "")
      if (key && value) loaded[key] = value
    }
  } catch {
    // optional file
  }
  return loaded
}

export function applyEnvRecord(record: Record<string, string>): void {
  for (const [key, value] of Object.entries(record)) {
    if (!process.env[key]) process.env[key] = value
  }
}

export function parseLinearBacklog(json: string): LinearBacklogFile {
  const backlog = JSON.parse(json) as LinearBacklogFile
  validateLinearBacklog(backlog)
  return backlog
}

export function validateLinearBacklog(backlog: LinearBacklogFile): void {
  if (!backlog.projectName?.trim()) {
    throw new Error("linear-backlog.json: missing projectName")
  }
  if (!Array.isArray(backlog.issues) || backlog.issues.length === 0) {
    throw new Error("linear-backlog.json: issues must be a non-empty array")
  }
  const titles = new Set<string>()
  for (const issue of backlog.issues) {
    if (!issue.title?.trim()) throw new Error("linear-backlog.json: issue missing title")
    if (!issue.description?.trim()) throw new Error(`linear-backlog.json: ${issue.title} missing description`)
    if (titles.has(issue.title)) throw new Error(`linear-backlog.json: duplicate title: ${issue.title}`)
    titles.add(issue.title)
  }
}

export function parseLinearConfig(json: string): LinearConfig {
  const config = JSON.parse(json) as LinearConfig
  if (!config.teamKey || !config.workspaceUrl || !config.teamUrl) {
    throw new Error("linear.config.json: missing teamKey or urls")
  }
  return config
}

export function buildProjectUrl(config: LinearConfig, projectName: string): string {
  const slug = projectName.trim().toLowerCase().replace(/\s+/g, "-")
  return `${config.teamUrl}/project/${slug}`
}

export function resolveRepoPaths(rootDir: string) {
  return {
    envLocal: resolve(rootDir, ".env.local"),
    backlog: resolve(rootDir, "scripts/linear-backlog.json"),
    config: resolve(rootDir, "scripts/linear.config.json"),
  }
}

export async function linearGraphql<T>(
  apiKey: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  })

  const payload = (await response.json()) as {
    data?: T
    errors?: { message: string }[]
  }

  if (!response.ok || payload.errors?.length) {
    const detail = payload.errors?.map((e) => e.message).join("; ") || response.statusText
    throw new Error(`Linear API error: ${detail}`)
  }

  return payload.data as T
}

export async function linearGraphqlWithRetry<T>(
  apiKey: string,
  query: string,
  variables: Record<string, unknown> = {},
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await linearGraphql<T>(apiKey, query, variables)
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes("429") || attempt === maxAttempts) break
      await new Promise((r) => setTimeout(r, attempt * 1500))
    }
  }
  throw lastError
}