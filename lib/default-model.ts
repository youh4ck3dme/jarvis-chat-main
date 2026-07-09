export const DEFAULT_AI_MODEL = "mistral/mistral-small-latest" as const

/** Server + client default; set in Vercel / .env.local */
export function getDefaultAiModel(): string {
  const fromPublic = process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL?.trim()
  if (fromPublic) return fromPublic

  const fromEnv = process.env.DEFAULT_AI_MODEL?.trim()
  if (fromEnv) return fromEnv

  return DEFAULT_AI_MODEL
}