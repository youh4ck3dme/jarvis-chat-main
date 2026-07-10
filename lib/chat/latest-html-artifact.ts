import { extractJarvisHtmlArtifact } from "@/copied-from-visual-html/lib/jarvis-artifacts";

import type { ChatSession, StoredChatMessage } from "./chat-sessions";

export type LatestHtmlArtifact = {
  html: string;
  sessionId: string;
  sessionTitle: string;
  messageId: string;
  createdAt: string;
};

function extractFromMessage(message: StoredChatMessage): string | null {
  if (message.role !== "assistant") return null;
  return extractJarvisHtmlArtifact([{ role: "assistant", content: message.content }]);
}

export function findLatestHtmlArtifact(sessions: ChatSession[]): LatestHtmlArtifact | null {
  let latest: LatestHtmlArtifact | null = null;

  for (const session of sessions) {
    for (const message of session.messages) {
      const html = extractFromMessage(message);
      if (!html) continue;

      const candidate: LatestHtmlArtifact = {
        html,
        sessionId: session.id,
        sessionTitle: session.title,
        messageId: message.id,
        createdAt: message.createdAt,
      };

      if (
        !latest ||
        new Date(candidate.createdAt).getTime() > new Date(latest.createdAt).getTime()
      ) {
        latest = candidate;
      }
    }
  }

  return latest;
}