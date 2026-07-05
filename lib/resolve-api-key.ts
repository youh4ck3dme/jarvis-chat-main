export type ProviderId = "google" | "openai" | "anthropic" | "mistral"

const PROVIDER_CONFIG: Record<ProviderId, { label: string; envVars: string[]; settingsLabel: string }> = {
  google: {
    label: "Gemini (Google)",
    envVars: ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
    settingsLabel: "Gemini API Key",
  },
  openai: {
    label: "OpenAI",
    envVars: ["OPENAI_API_KEY"],
    settingsLabel: "OpenAI API Key",
  },
  anthropic: {
    label: "Anthropic",
    envVars: ["ANTHROPIC_API_KEY"],
    settingsLabel: "Anthropic API Key",
  },
  mistral: {
    label: "Mistral",
    envVars: ["MISTRAL_API_KEY"],
    settingsLabel: "Mistral API Key",
  },
}

export function resolveApiKey(headerValue: string | null, provider: ProviderId): string {
  const trimmedHeader = headerValue?.trim()
  if (trimmedHeader) return trimmedHeader

  for (const envVar of PROVIDER_CONFIG[provider].envVars) {
    const envValue = process.env[envVar]?.trim()
    if (envValue) return envValue
  }

  return ""
}

export function missingApiKeyMessage(provider: ProviderId): string {
  const { label, envVars, settingsLabel } = PROVIDER_CONFIG[provider]
  const envHint = envVars.join(" or ")
  return `${label} API key is missing. Set ${envHint} in Vercel Environment Variables, or add your ${settingsLabel} in Settings.`
}

export function getProviderFromModel(model: string): ProviderId | null {
  if (model.startsWith("google/")) return "google"
  if (model.startsWith("openai/")) return "openai"
  if (model.startsWith("anthropic/")) return "anthropic"
  if (model.startsWith("mistral/")) return "mistral"
  return null
}

export function isProviderAuthError(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes("authentication failed") ||
    lower.includes("invalid api key") ||
    lower.includes("ai gateway") ||
    lower.includes("incorrect api key") ||
    lower.includes("unauthorized") ||
    lower.includes("api key is missing")
  )
}