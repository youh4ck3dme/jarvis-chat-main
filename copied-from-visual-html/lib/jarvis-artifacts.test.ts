import { describe, expect, it } from "vitest";

import {
  extractJarvisHtmlArtifact,
  prepareJarvisPreviewHtml,
  safeSanitizeHtml,
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
});
