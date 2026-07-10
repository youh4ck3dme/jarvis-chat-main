import {
  classifyDataUrl,
  decodeDataUrl,
  getDefaultAttachmentPrompt,
  type JarvisAttachmentKind,
} from "./jarvis-attachments"

export type ChatApiIncomingMessage = {
  role: string
  content: string
  imageData?: string
  attachment?: string
  attachmentName?: string
}

type ChatApiOutgoingMessage = {
  role: "user" | "assistant"
  content: string | Array<{ type: string; [key: string]: unknown }>
}

function buildHtmlAttachmentContent(fileName: string | undefined, html: string, userText: string): string {
  const label = fileName ? `[Attached HTML file: ${fileName}]` : "[Attached HTML file]"
  const prompt = userText.trim() || getDefaultAttachmentPrompt("html")
  return `${label}\n\n${html}\n\n---\nUser request:\n${prompt}`
}

function buildMultimodalFileContent(
  mimeType: string,
  base64Data: string,
  userText: string,
  kind: JarvisAttachmentKind,
): ChatApiOutgoingMessage["content"] {
  return [
    {
      type: "file",
      data: base64Data,
      mimeType,
    },
    {
      type: "text",
      text: userText.trim() || getDefaultAttachmentPrompt(kind),
    },
  ]
}

export function transformMessageForChatApi(
  message: ChatApiIncomingMessage,
  index: number,
  lastIndex: number,
): ChatApiOutgoingMessage {
  const isLastUserMessage = index === lastIndex && message.role === "user"

  if (isLastUserMessage && message.imageData && classifyDataUrl(message.imageData) === "image") {
    return {
      role: message.role as "user" | "assistant",
      content: [
        {
          type: "image",
          image: message.imageData,
        },
        {
          type: "text",
          text: message.content.trim() || getDefaultAttachmentPrompt("image"),
        },
      ],
    }
  }

  if (isLastUserMessage && message.attachment) {
    const kind = classifyDataUrl(message.attachment)

    if (kind === "pdf") {
      const { mimeType, base64Data } = decodeDataUrl(message.attachment)
      return {
        role: message.role as "user" | "assistant",
        content: buildMultimodalFileContent(mimeType, base64Data, message.content, "pdf"),
      }
    }

    if (kind === "html") {
      const { textContent } = decodeDataUrl(message.attachment)
      if (textContent) {
        return {
          role: message.role as "user" | "assistant",
          content: buildHtmlAttachmentContent(
            message.attachmentName,
            textContent,
            message.content,
          ),
        }
      }
    }
  }

  let textContent = message.content
  if ((message.imageData || message.attachment) && !isLastUserMessage) {
    if (message.imageData) {
      textContent = message.content || "[User shared an image]"
    } else if (message.attachment) {
      const kind = classifyDataUrl(message.attachment)
      textContent =
        message.content ||
        (kind === "html" ? "[User shared an HTML file]" : "[User shared a document]")
    }
  }

  return {
    role: message.role as "user" | "assistant",
    content: textContent,
  }
}

export function transformMessagesForChatApi(messages: ChatApiIncomingMessage[]): ChatApiOutgoingMessage[] {
  const lastIndex = messages.length - 1
  return messages.map((message, index) => transformMessageForChatApi(message, index, lastIndex))
}