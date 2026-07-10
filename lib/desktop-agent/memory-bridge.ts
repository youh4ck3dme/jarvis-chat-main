import { DESKTOP_AGENT_CONVERSATION_ID } from "./constants";

/**
 * Zod type or typescript schema helper to identify desktop voice sessions.
 * Maps types between the local Python extraction keys and the web MemoryType keys.
 */
export function getDesktopVoiceConversationId(): string {
  return DESKTOP_AGENT_CONVERSATION_ID;
}

/**
 * Returns true if a given memory entry belongs to the desktop voice agent.
 */
export function isDesktopVoiceEntry(entry: { metadata?: { tags?: string[] } }): boolean {
  return entry.metadata?.tags?.includes("desktop-voice") ?? false;
}

/**
 * Formats desktop entries for clean UI grouping.
 */
export function formatDesktopMemoryForDisplay(entryContent: string): string {
  // If entry contains 'key: value', pretty format it
  const match = entryContent.match(/^([^:]+):\s*(.*)$/);
  if (match) {
    const key = match[1].replace(/_/g, " ");
    const value = match[2];
    return `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`;
  }
  return entryContent;
}
