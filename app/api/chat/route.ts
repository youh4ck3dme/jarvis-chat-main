import { streamText } from "ai"
import { createGoogle } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createMistral } from "@ai-sdk/mistral"
import { jsonError } from "@/lib/api-response"
import "@/lib/env"
import { getDefaultAiModel } from "@/lib/default-model"
import { getProviderFromModel, missingApiKeyMessage, resolveApiKey } from "@/lib/resolve-api-key"

/**
 * POST /api/chat
 *
 * This route handler proxies requests to the appropriate AI provider.
 * It receives custom API keys in headers, falls back to server env vars,
 * and streams the response back.
 */
export async function POST(req: Request) {
  try {
    const { messages, model, system } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return jsonError("Invalid request: messages array required", 400)
    }

    // Get API keys from headers
    const mistralKey = req.headers.get("x-mistral-key")
    const googleKey = req.headers.get("x-google-key")
    const openAiKey = req.headers.get("x-openai-key")
    const anthropicKey = req.headers.get("x-anthropic-key")

    const selectedModel = model || getDefaultAiModel()
    const provider = getProviderFromModel(selectedModel)

    if (!provider) {
      return jsonError(`Unsupported provider for model: ${selectedModel}`, 400)
    }

    const headerKeys: Record<typeof provider, string | null> = {
      google: googleKey,
      openai: openAiKey,
      anthropic: anthropicKey,
      mistral: mistralKey,
    }

    const apiKey = resolveApiKey(headerKeys[provider], provider)

    if (!apiKey) {
      return jsonError(missingApiKeyMessage(provider), 401)
    }

    let modelInstance

    if (provider === "google") {
      const modelName = selectedModel.replace("google/", "")
      const google = createGoogle({ apiKey })
      modelInstance = google(modelName)
    } else if (provider === "openai") {
      const modelName = selectedModel.replace("openai/", "")
      const openai = createOpenAI({ apiKey })
      modelInstance = openai(modelName)
    } else if (provider === "anthropic") {
      let modelName = selectedModel.replace("anthropic/", "")
      // Map frontend alias to actual Anthropic model name
      if (modelName === "claude-sonnet-4") {
        modelName = "claude-3-5-sonnet-latest"
      }
      const anthropic = createAnthropic({ apiKey })
      modelInstance = anthropic(modelName)
    } else {
      const modelName = selectedModel.replace("mistral/", "")
      const mistral = createMistral({ apiKey })
      modelInstance = mistral(modelName)
    }

    const lastIndex = messages.length - 1
    const transformedMessages = messages.map(
      (m: { role: string; content: string; imageData?: string; attachment?: string }, index: number) => {
        // Only process image/file for the last user message
        const isLastUserMessage = index === lastIndex && m.role === "user"

        if (isLastUserMessage && m.imageData && m.imageData.startsWith("data:image/")) {
          // For the current message with an image, use multimodal content format
          return {
            role: m.role as "user" | "assistant",
            content: [
              {
                type: "image" as const,
                image: m.imageData,
              },
              {
                type: "text" as const,
                text: m.content || "Describe this image in detail.",
              },
            ],
          }
        } else if (isLastUserMessage && m.attachment && (m.attachment.startsWith("data:application/pdf") || m.attachment.startsWith("data:text/plain"))) {
          const [prefix, base64Data] = m.attachment.split(",")
          const mimeType = prefix.replace("data:", "").split(";")[0]
          return {
            role: m.role as "user" | "assistant",
            content: [
              {
                type: "file" as const,
                data: base64Data,
                mimeType,
              },
              {
                type: "text" as const,
                text: m.content || "Analyze this document.",
              },
            ],
          }
        }

        // For all other messages (history), use text only
        // If there was an image or attachment, mention it in the text
        let textContent = m.content
        if ((m.imageData || m.attachment) && !isLastUserMessage) {
          textContent = m.content || (m.imageData ? "[User shared an image]" : "[User shared a document]")
        }

        return {
          role: m.role as "user" | "assistant",
          content: textContent,
        }
      },
    )

    // Filter out any messages with empty content
    const validMessages = transformedMessages.filter((m: { content: string | object[] }) => {
      if (typeof m.content === "string") {
        return m.content.trim().length > 0
      }
      return true // Keep multimodal messages
    })

    if (validMessages.length === 0) {
      return jsonError("No valid messages to process", 400)
    }

    const result = streamText({
      model: modelInstance as any,
      messages: validMessages as any,
      system: system || `You are a helpful, friendly AI assistant. You provide clear, concise, and accurate responses. 
When explaining code or technical concepts, use markdown formatting with code blocks where appropriate.
Be conversational but professional. If you're unsure about something, say so honestly.
When analyzing images, describe them in detail and answer any questions about them.`,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error("Chat API error:", error)

    return jsonError(error instanceof Error ? error.message : "An unexpected error occurred", 500)
  }
}
