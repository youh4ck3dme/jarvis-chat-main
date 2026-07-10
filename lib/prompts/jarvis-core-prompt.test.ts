import { describe, expect, it } from "vitest";
import {
  clearJarvisCorePromptCache,
  getJarvisCorePrompt,
} from "./jarvis-core-prompt";

describe("jarvis-core-prompt", () => {
  it("successfully reads the shared prompt file content", () => {
    clearJarvisCorePromptCache();
    const prompt = getJarvisCorePrompt();
    expect(prompt).toBeTypeOf("string");
    expect(prompt.length).toBeGreaterThan(50);
    expect(prompt).toContain("JARVIS");
  });

  it("caches prompt until cache is cleared", () => {
    clearJarvisCorePromptCache();
    const first = getJarvisCorePrompt();
    const second = getJarvisCorePrompt();
    expect(second).toBe(first);

    clearJarvisCorePromptCache();
    const afterClear = getJarvisCorePrompt();
    expect(afterClear).toBe(first);
  });
});
