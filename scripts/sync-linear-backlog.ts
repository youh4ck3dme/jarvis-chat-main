/**
 * Sync scripts/linear-backlog.json → Linear issues (GraphQL API).
 *
 * Config: scripts/linear.config.json
 * Secrets: .env.local → LINEAR_API_KEY, optional LINEAR_TEAM_KEY / LINEAR_TEAM_ID
 *
 * Usage:
 *   pnpm linear:sync
 *   pnpm linear:sync --dry-run
 *   pnpm linear:status
 */
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import {
  applyEnvRecord,
  buildProjectUrl,
  linearGraphqlWithRetry,
  loadEnvLocalFile,
  parseLinearBacklog,
  parseLinearConfig,
  resolveRepoPaths,
  type LinearBacklogIssue,
  type LinearConfig,
} from "../lib/ops/linear-backlog-sync"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const paths = resolveRepoPaths(repoRoot)

const args = new Set(process.argv.slice(2))
const dryRun = args.has("--dry-run")
const statusOnly = args.has("--status")

function requireApiKey(): string {
  const apiKey = process.env.LINEAR_API_KEY
  if (!apiKey) {
    throw new Error(
      "Missing LINEAR_API_KEY.\n" +
        "1. https://linear.app/settings/api\n" +
        "2. Add to .env.local:\n" +
        "   LINEAR_API_KEY=lin_api_...\n" +
        "   LINEAR_TEAM_KEY=YOU",
    )
  }
  return apiKey
}

async function resolveTeamId(apiKey: string, config: LinearConfig): Promise<string> {
  if (process.env.LINEAR_TEAM_ID) return process.env.LINEAR_TEAM_ID

  const teamKey = process.env.LINEAR_TEAM_KEY ?? config.teamKey
  const data = await linearGraphqlWithRetry<{
    teams: { nodes: { id: string; key: string; name: string }[] }
  }>(apiKey, `query { teams { nodes { id key name } } }`)

  const match = data.teams.nodes.find((t) => t.key.toLowerCase() === teamKey.toLowerCase())
  if (!match) {
    const available = data.teams.nodes.map((t) => `${t.key} (${t.name})`).join(", ")
    throw new Error(`Team ${teamKey} not found. Available: ${available}`)
  }
  return match.id
}

async function ensureProject(
  apiKey: string,
  teamId: string,
  name: string,
  description?: string,
): Promise<string> {
  const existing = await linearGraphqlWithRetry<{
    team: { projects: { nodes: { id: string; name: string }[] } }
  }>(apiKey, `query($teamId: String!) { team(id: $teamId) { projects { nodes { id name } } } }`, {
    teamId,
  })

  const found = existing.team.projects.nodes.find((p) => p.name.toLowerCase() === name.toLowerCase())
  if (found) return found.id

  if (dryRun) {
    console.log(`[dry-run] would create project: ${name}`)
    return "dry-run-project-id"
  }

  const created = await linearGraphqlWithRetry<{
    projectCreate: { project: { id: string } }
  }>(
    apiKey,
    `mutation($input: ProjectCreateInput!) { projectCreate(input: $input) { project { id } } }`,
    {
      input: { teamIds: [teamId], name, description: description ?? "" },
    },
  )
  return created.projectCreate.project.id
}

async function listExistingTitles(apiKey: string, teamId: string): Promise<Set<string>> {
  const data = await linearGraphqlWithRetry<{
    team: { issues: { nodes: { title: string }[] } }
  }>(
    apiKey,
    `query($teamId: String!) {
      team(id: $teamId) { issues(first: 250, orderBy: updatedAt) { nodes { title } } }
    }`,
    { teamId },
  )
  return new Set(data.team.issues.nodes.map((i) => i.title))
}

async function createIssue(
  apiKey: string,
  teamId: string,
  projectId: string,
  issue: LinearBacklogIssue,
): Promise<string | null> {
  if (dryRun) {
    console.log(`[dry-run] create: ${issue.title}`)
    return null
  }

  const result = await linearGraphqlWithRetry<{
    issueCreate: { issue: { identifier: string; url: string } }
  }>(
    apiKey,
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) { issue { identifier url } }
    }`,
    {
      input: {
        teamId,
        projectId,
        title: issue.title,
        description: issue.description,
        priority: issue.priority ?? 3,
      },
    },
  )
  return result.issueCreate.issue.url
}

async function runStatus(apiKey: string, config: LinearConfig): Promise<void> {
  const teamId = await resolveTeamId(apiKey, config)
  const data = await linearGraphqlWithRetry<{
    viewer: { name: string }
    team: { name: string; issues: { nodes: { title: string }[] } }
  }>(
    apiKey,
    `query($teamId: String!) {
      viewer { name }
      team(id: $teamId) { name issues(first: 250) { nodes { title } } }
    }`,
    { teamId },
  )

  const backlog = parseLinearBacklog(readFileSync(paths.backlog, "utf-8"))
  const existing = new Set(data.team.issues.nodes.map((i) => i.title))
  const synced = backlog.issues.filter((i) => existing.has(i.title)).length
  const missing = backlog.issues.length - synced

  console.log(`✅ Linear connected as ${data.viewer.name}`)
  console.log(`Team: ${data.team.name} (${config.teamKey})`)
  console.log(`Backlog: ${synced}/${backlog.issues.length} issues present, ${missing} missing`)
  console.log(`Board: ${config.teamUrl}`)
  console.log(`Project: ${buildProjectUrl(config, config.projectName)}`)
}

async function main(): Promise<void> {
  applyEnvRecord(loadEnvLocalFile(paths.envLocal))
  const config = parseLinearConfig(readFileSync(paths.config, "utf-8"))
  const backlog = parseLinearBacklog(readFileSync(paths.backlog, "utf-8"))

  if (statusOnly) {
    await runStatus(requireApiKey(), config)
    return
  }

  console.log(`Linear sync — ${backlog.issues.length} issues${dryRun ? " (dry-run)" : ""}\n`)

  if (dryRun && !process.env.LINEAR_API_KEY) {
    for (const issue of backlog.issues) {
      console.log(`[dry-run] ${issue.title}`)
    }
    console.log(`\nDone — dry-run ${backlog.issues.length} issues`)
    console.log(`Set LINEAR_API_KEY in .env.local → ${config.apiSettingsUrl}`)
    return
  }

  const apiKey = requireApiKey()
  const teamId = await resolveTeamId(apiKey, config)
  const projectId = await ensureProject(apiKey, teamId, backlog.projectName, backlog.projectDescription)
  const existing = await listExistingTitles(apiKey, teamId)

  let created = 0
  let skipped = 0

  for (const issue of backlog.issues) {
    if (existing.has(issue.title)) {
      console.log(`⏭️  exists: ${issue.title}`)
      skipped += 1
      continue
    }
    const url = await createIssue(apiKey, teamId, projectId, issue)
    console.log(url ? `✅ ${issue.title}\n   ${url}` : `✅ ${issue.title}`)
    created += 1
  }

  console.log(`\nDone — created: ${created}, skipped: ${skipped}`)
  console.log(`Linear board: ${config.teamUrl}`)
  console.log(`JARVIS project: ${buildProjectUrl(config, backlog.projectName)}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})