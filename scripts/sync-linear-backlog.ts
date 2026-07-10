/**
 * Sync scripts/linear-backlog.json → Linear issues (GraphQL API).
 *
 * Required env:
 *   LINEAR_API_KEY   — Personal API key from Linear Settings → API
 *   LINEAR_TEAM_ID   — Team UUID (or set LINEAR_TEAM_KEY=e.g. JAR)
 *
 * Usage:
 *   pnpm linear:sync
 *   pnpm linear:sync --dry-run
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

type BacklogIssue = {
  title: string
  description: string
  priority?: number
  labels?: string[]
}

type BacklogFile = {
  projectName: string
  projectDescription?: string
  issues: BacklogIssue[]
}

const LINEAR_API = "https://api.linear.app/graphql"
const dryRun = process.argv.includes("--dry-run")

async function linearRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.LINEAR_API_KEY
  if (!apiKey) {
    throw new Error(
      "Missing LINEAR_API_KEY. Create one at https://linear.app/settings/api and run:\n  LINEAR_API_KEY=lin_api_... LINEAR_TEAM_ID=... pnpm linear:sync",
    )
  }

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

async function resolveTeamId(): Promise<string> {
  const teamId = process.env.LINEAR_TEAM_ID
  if (teamId) return teamId

  const teamKey = process.env.LINEAR_TEAM_KEY ?? "JAR"
  const data = await linearRequest<{
    teams: { nodes: { id: string; key: string; name: string }[] }
  }>(
    `query { teams { nodes { id key name } } }`,
    {},
  )

  const match = data.teams.nodes.find(
    (team) => team.key.toLowerCase() === teamKey.toLowerCase(),
  )
  if (!match) {
    const available = data.teams.nodes.map((t) => `${t.key} (${t.name})`).join(", ")
    throw new Error(`Team ${teamKey} not found. Available: ${available}`)
  }
  return match.id
}

async function ensureProject(teamId: string, name: string, description?: string): Promise<string> {
  const existing = await linearRequest<{
    team: { projects: { nodes: { id: string; name: string }[] } }
  }>(
    `query($teamId: String!) { team(id: $teamId) { projects { nodes { id name } } } }`,
    { teamId },
  )

  const found = existing.team.projects.nodes.find(
    (p) => p.name.toLowerCase() === name.toLowerCase(),
  )
  if (found) return found.id

  if (dryRun) {
    console.log(`[dry-run] would create project: ${name}`)
    return "dry-run-project-id"
  }

  const created = await linearRequest<{
    projectCreate: { project: { id: string } }
  }>(
    `mutation($input: ProjectCreateInput!) {
      projectCreate(input: $input) { project { id } }
    }`,
    {
      input: {
        teamIds: [teamId],
        name,
        description: description ?? "",
      },
    },
  )

  return created.projectCreate.project.id
}

async function listExistingTitles(teamId: string): Promise<Set<string>> {
  const data = await linearRequest<{
    team: { issues: { nodes: { title: string }[] } }
  }>(
    `query($teamId: String!) {
      team(id: $teamId) {
        issues(first: 250, orderBy: updatedAt) { nodes { title } }
      }
    }`,
    { teamId },
  )
  return new Set(data.team.issues.nodes.map((i) => i.title))
}

async function createIssue(
  teamId: string,
  projectId: string,
  issue: BacklogIssue,
): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] create: ${issue.title}`)
    return
  }

  await linearRequest(
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) { success issue { identifier url } }
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
  console.log(`✅ ${issue.title}`)
}

async function main(): Promise<void> {
  const backlogPath = resolve(__dirname, "linear-backlog.json")
  const backlog = JSON.parse(readFileSync(backlogPath, "utf-8")) as BacklogFile

  console.log(`Linear sync — ${backlog.issues.length} issues${dryRun ? " (dry-run)" : ""}\n`)

  if (dryRun && !process.env.LINEAR_API_KEY) {
    console.log(`Project: ${backlog.projectName}`)
    console.log(`${backlog.projectDescription ?? ""}\n`)
    for (const issue of backlog.issues) {
      console.log(`[dry-run] ${issue.title}`)
      console.log(`  priority: ${issue.priority ?? 3} | labels: ${(issue.labels ?? []).join(", ")}`)
      console.log(`  ${issue.description.split("\n")[0]}`)
    }
    console.log(`\nDone — dry-run ${backlog.issues.length} issues (set LINEAR_API_KEY to push)`)
    return
  }

  const teamId = await resolveTeamId()
  const projectId = await ensureProject(
    teamId,
    backlog.projectName,
    backlog.projectDescription,
  )
  const existing = await listExistingTitles(teamId)

  let created = 0
  let skipped = 0

  for (const issue of backlog.issues) {
    if (existing.has(issue.title)) {
      console.log(`⏭️  exists: ${issue.title}`)
      skipped += 1
      continue
    }
    await createIssue(teamId, projectId, issue)
    created += 1
  }

  console.log(`\nDone — created: ${created}, skipped: ${skipped}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})