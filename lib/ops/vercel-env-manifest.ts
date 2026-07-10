export type VercelEnvTarget = "production" | "preview" | "development"

export type EnvRequirement = "required" | "recommended" | "optional"

export type EnvVarRule = {
  key: string
  requirement: EnvRequirement
  targets: VercelEnvTarget[]
  serverOnly?: boolean
  description: string
}

export const JARVIS_VERCEL_PROJECT = {
  projectId: "prj_ffTPWgHoLwa6KX4IoVv0SvP9jDhh",
  teamId: "team_TDBfz8ZkzAmnjqyiWEGVIeO1",
  projectName: "jarvis",
  productionUrl: "https://jarvis-ten-omega.vercel.app",
} as const

/** Server secrets that must never be copied to NEXT_PUBLIC_* on Vercel. */
export const SECRETS_THAT_MUST_NOT_BE_PUBLIC = [
  "BUILDER_UNLOCK_PASSWORD",
  "MISTRAL_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
] as const

export const SUPABASE_ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const

const ALL_TARGETS: VercelEnvTarget[] = ["production", "preview", "development"]

export const JARVIS_VERCEL_ENV_RULES: EnvVarRule[] = [
  {
    key: "MISTRAL_API_KEY",
    requirement: "required",
    targets: ALL_TARGETS,
    serverOnly: true,
    description: "Planner + chat stream",
  },
  {
    key: "BUILDER_UNLOCK_PASSWORD",
    requirement: "required",
    targets: ALL_TARGETS,
    serverOnly: true,
    description: "Server-side builder unlock",
  },
  {
    key: "DEFAULT_AI_MODEL",
    requirement: "recommended",
    targets: ALL_TARGETS,
    serverOnly: true,
    description: "Server default AI model",
  },
  {
    key: "NEXT_PUBLIC_DEFAULT_AI_MODEL",
    requirement: "recommended",
    targets: ALL_TARGETS,
    description: "Client default AI model in composer",
  },
  {
    key: "SUPABASE_URL",
    requirement: "optional",
    targets: ALL_TARGETS,
    serverOnly: true,
    description: "Cloud session/memory sync (server)",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    requirement: "optional",
    targets: ALL_TARGETS,
    serverOnly: true,
    description: "Cloud sync service role",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    requirement: "optional",
    targets: ALL_TARGETS,
    description: "Supabase Auth + client sync URL",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    requirement: "optional",
    targets: ALL_TARGETS,
    description: "Supabase Auth anon key",
  },
  {
    key: "BUILDER_UNLOCK_RATE_LIMIT_MAX",
    requirement: "optional",
    targets: ALL_TARGETS,
    serverOnly: true,
    description: "Unlock rate limit max attempts per IP",
  },
  {
    key: "BUILDER_UNLOCK_RATE_LIMIT_WINDOW_SEC",
    requirement: "optional",
    targets: ALL_TARGETS,
    serverOnly: true,
    description: "Unlock rate limit window seconds",
  },
  {
    key: "GEMINI_API_KEY",
    requirement: "optional",
    targets: ALL_TARGETS,
    serverOnly: true,
    description: "Optional Gemini provider fallback",
  },
  {
    key: "GOOGLE_GENERATIVE_AI_API_KEY",
    requirement: "optional",
    targets: ALL_TARGETS,
    serverOnly: true,
    description: "Alias for Gemini provider fallback",
  },
  {
    key: "OPENAI_API_KEY",
    requirement: "optional",
    targets: ALL_TARGETS,
    serverOnly: true,
    description: "Optional OpenAI provider fallback",
  },
  {
    key: "ANTHROPIC_API_KEY",
    requirement: "optional",
    targets: ALL_TARGETS,
    serverOnly: true,
    description: "Optional Anthropic provider fallback",
  },
  {
    key: "BLOB_READ_WRITE_TOKEN",
    requirement: "optional",
    targets: ALL_TARGETS,
    serverOnly: true,
    description: "Vercel Blob uploads",
  },
]

export function parseEnvExampleKeys(contents: string): string[] {
  const keys = new Set<string>()

  for (const line of contents.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const match = trimmed.match(/^([A-Z][A-Z0-9_]+)=/)
    if (match?.[1]) keys.add(match[1])
  }

  return [...keys].sort()
}