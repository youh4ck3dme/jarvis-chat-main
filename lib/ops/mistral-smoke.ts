import { createMistral } from "@ai-sdk/mistral"
import { generateText } from "ai"

import { DEFAULT_AI_MODEL } from "@/lib/default-model"

const PLACEHOLDER_KEYS = new Set(["ci-placeholder-key", "test-mistral-key"])

export type MistralSmokeResult = {
  skipped: boolean
  reason?: string
  model?: string
  text?: string
  latencyMs?: number
}

export function resolveMistralSmokeModel(): string {
  const configured = process.env.MISTRAL_SMOKE_MODEL?.trim()
  if (configured) return configured.replace(/^mistral\//, "")

  const fromEnv = process.env.DEFAULT_AI_MODEL?.trim()
  if (fromEnv?.startsWith("mistral/")) {
    return fromEnv.replace(/^mistral\//, "")
  }

  return DEFAULT_AI_MODEL.replace(/^mistral\//, "")
}

export function shouldRunMistralSmoke(apiKey?: string): boolean {
  if (process.env.SKIP_MISTRAL_SMOKE === "1") return false
  if (process.env.SMOKE_FORCE === "1") return true

  const key = (apiKey ?? process.env.MISTRAL_API_KEY ?? "").trim()
  if (!key) return false
  if (PLACEHOLDER_KEYS.has(key)) return false
  return true
}

export async function runMistralSmoke(options?: {
  apiKey?: string
  model?: string
  fetchImpl?: typeof fetch
}): Promise<MistralSmokeResult> {
  const apiKey = (options?.apiKey ?? process.env.MISTRAL_API_KEY ?? "").trim()

  if (!shouldRunMistralSmoke(apiKey)) {
    return {
      skipped: true,
      reason: "MISTRAL_API_KEY not set or placeholder — smoke skipped",
    }
  }

  const modelName = (options?.model ?? resolveMistralSmokeModel()).replace(/^mistral\//, "")
  const mistral = createMistral({ apiKey })
  const startedAt = Date.now()

  const result = await generateText({
    model: mistral(modelName),
    prompt: "Reply with exactly: JARVIS_SMOKE_OK",
    maxOutputTokens: 24,
    abortSignal: AbortSignal.timeout(45_000),
  })

  const text = result.text.trim()
  const latencyMs = Date.now() - startedAt

  if (!text) {
    throw new Error("Mistral smoke failed: empty response")
  }

  if (!text.includes("JARVIS_SMOKE_OK")) {
    throw new Error(`Mistral smoke failed: unexpected response "${text.slice(0, 120)}"`)
  }

  return {
    skipped: false,
    model: modelName,
    text,
    latencyMs,
  }
}

export function formatMistralSmokeResult(result: MistralSmokeResult): string {
  if (result.skipped) {
    return `Mistral smoke: SKIPPED (${result.reason})`
  }

  return `Mistral smoke: OK — model=${result.model}, latency=${result.latencyMs}ms, response="${result.text}"`
}