import { streamText } from "ai"
import { createGoogle } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createMistral } from "@ai-sdk/mistral"
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
    const { messages, model } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid request: messages array required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Get API keys from headers
    const mistralKey = req.headers.get("x-mistral-key")
    const googleKey = req.headers.get("x-google-key")
    const openAiKey = req.headers.get("x-openai-key")
    const anthropicKey = req.headers.get("x-anthropic-key")

    const selectedModel = model || "mistral/mistral-large-latest"
    const provider = getProviderFromModel(selectedModel)

    if (!provider) {
      return new Response(JSON.stringify({ error: `Unsupported provider for model: ${selectedModel}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const headerKeys: Record<typeof provider, string | null> = {
      google: googleKey,
      openai: openAiKey,
      anthropic: anthropicKey,
      mistral: mistralKey,
    }

    const apiKey = resolveApiKey(headerKeys[provider], provider)

    if (!apiKey) {
      return new Response(JSON.stringify({ error: missingApiKeyMessage(provider) }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
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
      (m: { role: string; content: string; imageData?: string }, index: number) => {
        // Only process image for the last user message
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
        }

        // For all other messages (history), use text only
        // If there was an image, mention it in the text
        let textContent = m.content
        if (m.imageData && !isLastUserMessage) {
          textContent = m.content || "[User shared an image]"
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
      return new Response(JSON.stringify({ error: "No valid messages to process" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const result = streamText({
      model: modelInstance as any,
      messages: validMessages as any,
      system: `You are a helpful, friendly AI assistant. You provide clear, concise, and accurate responses. 
When explaining code or technical concepts, use markdown formatting with code blocks where appropriate.
Be conversational but professional. If you're unsure about something, say so honestly.
When analyzing images, describe them in detail and answer any questions about them.`,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error("Chat API error:", error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
