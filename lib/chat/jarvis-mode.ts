export type JarvisMode = "chat" | "builder";

export const JARVIS_MODE_STORAGE_KEY = "jarvis-mode";
export const JARVIS_BUILDER_UNLOCKED_KEY = "jarvis-builder-unlocked";

import { JARVIS_ATTACHMENT_SYSTEM_PROMPT } from "./jarvis-attachments";

export const JARVIS_CHAT_SYSTEM_PROMPT = `You are Jarvis — a helpful, concise AI assistant in a chat workspace.

Rules:
- Respond in the same language the user writes in (Slovak, English, etc.).
- Have a normal conversation. Answer questions, explain ideas, brainstorm, and help with planning.
- Do NOT generate HTML, CSS, JavaScript, or full code artifacts unless the user explicitly asks for code.
- Do NOT wrap responses in markdown code fences unless showing a small snippet the user requested.
- Keep replies focused and readable. Use short paragraphs or bullet lists when helpful.
- You are in Chat mode — conversation first, not automatic app building.

${JARVIS_ATTACHMENT_SYSTEM_PROMPT}`;

export function isValidJarvisMode(value: string | null | undefined): value is JarvisMode {
  return value === "chat" || value === "builder";
}

export function readStoredJarvisMode(): JarvisMode {
  if (typeof window === "undefined") return "chat";
  const stored = window.localStorage.getItem(JARVIS_MODE_STORAGE_KEY);
  return isValidJarvisMode(stored) ? stored : "chat";
}

export function readBuilderUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(JARVIS_BUILDER_UNLOCKED_KEY) === "true";
}

export function persistJarvisMode(mode: JarvisMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(JARVIS_MODE_STORAGE_KEY, mode);
}

export function persistBuilderUnlocked(unlocked: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(JARVIS_BUILDER_UNLOCKED_KEY, unlocked ? "true" : "false");
}

export function modeLabel(mode: JarvisMode): string {
  return mode === "builder" ? "Builder" : "Chat";
}