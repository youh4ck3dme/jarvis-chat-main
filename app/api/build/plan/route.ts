import { jsonError, jsonSuccess } from "@/lib/api-response"
import { Logger } from "@/lib/logger"
import { planBuild } from "@/lib/agents/build-planner"
import { getDefaultAiModel } from "@/lib/default-model"
import { getProviderFromModel, missingApiKeyMessage, resolveApiKey } from "@/lib/resolve-api-key"

export async function POST(req: Request) {
  try {
    const { prompt, experienceHint } = await req.json()

    if (!prompt || typeof prompt !== "string") {
      return jsonError("Invalid request: prompt string required", 400)
    }

    const mistralKey = req.headers.get("x-mistral-key")
    const selectedModel = getDefaultAiModel()
    const provider = getProviderFromModel(selectedModel)

    if (provider !== "mistral") {
      return jsonError("Build planner requires a Mistral model", 400)
    }

    const apiKey = resolveApiKey(mistralKey, provider)
    if (!apiKey) {
      return jsonError(missingApiKeyMessage(provider), 401)
    }

    const result = await planBuild(
      apiKey,
      prompt,
      typeof experienceHint === "string" ? experienceHint : null,
    )

    return jsonSuccess(result)
  } catch (error) {
    Logger.error("Build plan API error", error)
    return jsonError(error instanceof Error ? error.message : "An unexpected error occurred", 500)
  }
}