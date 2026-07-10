import { readFileSync } from "fs";
import { join } from "path";

let cached: string | null = null;

/**
 * Loads the shared JARVIS core prompt from `shared/jarvis-core-prompt.txt`.
 * Cached after first read for performance.
 *
 * Used by both web chat (system message) and desktop agent (Gemini Live config).
 * Desktop agent syncs via `scripts/sync-jarvis-prompt.sh`.
 */
export function getJarvisCorePrompt(): string {
  if (cached) return cached;
  const path = join(process.cwd(), "shared", "jarvis-core-prompt.txt");
  cached = readFileSync(path, "utf-8");
  return cached;
}

export function clearJarvisCorePromptCache(): void {
  cached = null;
}
