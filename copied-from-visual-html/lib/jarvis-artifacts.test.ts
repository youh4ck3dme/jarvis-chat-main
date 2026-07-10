import { describe, expect, it } from "vitest";

import {
  evaluateMobileReadiness,
} from "@/lib/agents/build-mobile-validator";
import { evaluateBuildArtifact } from "@/lib/agents/build-evaluator";

import {
  applyJarvisHtmlRepairToAssistantContent,
  extractJarvisHtmlArtifact,
  prepareJarvisPreviewHtml,
  repairJarvisHtmlArtifact,
  safeSanitizeHtml,
  validateJarvisHtmlArtifact,
} from "./jarvis-artifacts";

describe("jarvis-artifacts", () => {
  it("includes script-src unsafe-inline in preview CSP meta", () => {
    const html = prepareJarvisPreviewHtml("<main>Hello</main>");
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("script-src 'unsafe-inline'");
  });

  it("removes external script src while keeping inline scripts", () => {
    const raw =
      '<html><body><script src="https://cdn.example.com/app.js"></script><script>alert(1)</script><main>OK</main></body></html>';
    const sanitized = safeSanitizeHtml(raw);

    expect(sanitized).not.toContain("cdn.example.com");
    expect(sanitized).toContain("<script");
    expect(sanitized).toContain("alert(1)");
    expect(sanitized).toContain("OK");
  });

  it("extracts HTML from the latest assistant fenced block", () => {
    const artifact = extractJarvisHtmlArtifact([
      { role: "user", content: "build me a page" },
      { role: "assistant", content: "```html\n<div>Old</div>\n```" },
      { role: "assistant", content: "```html\n<div>New</div>\n```" },
    ]);

    expect(artifact).toContain("New");
    expect(artifact).not.toContain("Old");
  });

  it("wraps streaming partial HTML with CSP without full sanitization pass", () => {
    const streaming = prepareJarvisPreviewHtml("<main>Partial", { streaming: true });
    expect(streaming).toContain("Partial");
    expect(streaming).toContain("script-src 'unsafe-inline'");
  });

  it("repairs truncated builder HTML with script, closing tags and mobile CSS", () => {
    const truncated = `<!DOCTYPE html>
<html>
<head><style>body { margin: 0; width: 1200px; }</style></head>
<body>
  <section id="hero"><button>Start</button></section>`;

    const repaired = repairJarvisHtmlArtifact(truncated);

    expect(repaired.toLowerCase()).toContain("</html>");
    expect(repaired.toLowerCase()).toContain("<script");
    expect(repaired).toMatch(/@media\s*\([^)]*max-width/i);
    expect(repaired).toContain('name="viewport"');
    expect(repaired).not.toMatch(/width:\s*1200px/i);

    expect(validateJarvisHtmlArtifact(repaired).ok).toBe(true);
    expect(evaluateBuildArtifact(repaired).ok).toBe(true);
    expect(evaluateMobileReadiness(repaired).ok).toBe(true);
  });

  it("rewrites fenced assistant content when repair changes the artifact", () => {
    const assistantContent = "```html\n<section><button>Go</button></section>\n```";
    const result = applyJarvisHtmlRepairToAssistantContent(assistantContent);

    expect(result.changed).toBe(true);
    expect(result.content).toContain("```html");
    expect(result.content.toLowerCase()).toContain("</html>");
    expect(result.content.toLowerCase()).toContain("<script");
  });
});
