import type { JarvisMessage } from "../types/jarvis";

const HTML_FENCE_PATTERN = /```(?:html)?\s*([\s\S]*?)(?:```|$)/i;
const FULL_HTML_PATTERN = /<!doctype\s+html|<html[\s>]/i;
const HTML_FRAGMENT_PATTERN = /<(body|main|div|section|style|header|footer|nav|article)[\s>]/i;

export type JarvisPreviewPrepareOptions = {
  /** Skip heavy sanitization while tokens are still arriving. */
  streaming?: boolean;
};

function looksLikeHtml(fragment: string): boolean {
  const trimmed = fragment.trim();
  if (!trimmed) return false;
  return FULL_HTML_PATTERN.test(trimmed) || HTML_FRAGMENT_PATTERN.test(trimmed);
}

function extractHtmlFromAssistantContent(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const fenceMatch = trimmed.match(HTML_FENCE_PATTERN);
  if (fenceMatch) {
    const fenced = fenceMatch[1].replace(/```\s*$/i, "").trim();
    return fenced && looksLikeHtml(fenced) ? fenced : fenced || null;
  }

  const htmlStart = trimmed.search(FULL_HTML_PATTERN);
  if (htmlStart >= 0) return trimmed.slice(htmlStart).trim();

  return null;
}

const PREVIEW_CSP =
  "default-src 'none'; img-src data: blob:; media-src data: blob:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';";

const CSP_META = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">`;

export function extractJarvisHtmlArtifact(messages: Pick<JarvisMessage, "role" | "content">[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;

    const extracted = extractHtmlFromAssistantContent(message.content);
    if (extracted) return extracted;
  }

  return null;
}

export function safeSanitizeHtml(rawHtml: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return rawHtml;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");

    const allowedTags = new Set([
      "html",
      "head",
      "body",
      "meta",
      "style",
      "title",
      "div",
      "span",
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "strong",
      "em",
      "code",
      "pre",
      "blockquote",
      "a",
      "img",
      "main",
      "section",
      "nav",
      "form",
      "input",
      "button",
      "label",
      "textarea",
      "select",
      "option",
      "script",
    ]);

    // Retrieve all elements inside the parsed document
    const elements = doc.getElementsByTagName("*");

    // Iterate backwards since we will remove nodes dynamically
    for (let i = elements.length - 1; i >= 0; i -= 1) {
      const el = elements[i];
      const tagName = el.tagName.toLowerCase();

      if (!allowedTags.has(tagName)) {
        el.parentNode?.removeChild(el);
        continue;
      }

      // Drop external script loads; sandbox preview allows inline JS only.
      if (tagName === "script") {
        const src = el.getAttribute("src")?.trim() ?? "";
        if (src) {
          el.parentNode?.removeChild(el);
          continue;
        }
      }

      // Clean attributes
      const attrs = Array.from(el.attributes);
      for (let j = 0; j < attrs.length; j += 1) {
        const attr = attrs[j];
        const name = attr.name.toLowerCase();

        // 1. Remove all event handlers (on*)
        if (name.startsWith("on")) {
          el.removeAttribute(attr.name);
          continue;
        }

        // 2. Filter URLs in sensitive attributes
        if (
          name === "href" ||
          name === "src" ||
          name === "srcset" ||
          name === "poster" ||
          name === "action"
        ) {
          const val = attr.value.trim();

          // Block javascript: and data: URLs (except safe data:image/...)
          if (/^(javascript:|data:(?!image\/))/i.test(val)) {
            el.removeAttribute(attr.name);
            continue;
          }

          // Block absolute remote loads (http, https, //)
          if (/^(https?:|\/\/)/i.test(val)) {
            el.removeAttribute(attr.name);
            continue;
          }
        }
      }
    }

    // Process inline <style> content to strip remote imports/urls
    const styles = doc.getElementsByTagName("style");
    for (let i = 0; i < styles.length; i += 1) {
      const styleEl = styles[i];
      let content = styleEl.textContent || "";

      // Strip remote CSS imports
      content = content.replace(/@import\s+(?:url\()?["']?(?:https?:|\/\/)[^;]+;/gi, "");
      // Replace remote background urls with 'none'
      content = content.replace(/url\(\s*["']?(?:https?:|\/\/)[^)]+\)/gi, "none");

      styleEl.textContent = content;
    }

    return doc.documentElement ? doc.documentElement.outerHTML : doc.body.innerHTML;
  } catch (e) {
    console.error("DOMParser sanitization failed:", e);
    return rawHtml;
  }
}

function wrapStreamingPreviewHtml(rawHtml: string): string {
  let html = rawHtml.trim().replace(/```\s*$/i, "");
  if (!html) return "";

  if (/<head[\s>]/i.test(html)) {
    if (!/Content-Security-Policy/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, (head) => `${head}\n${CSP_META}`);
    }
    return html;
  }

  if (/<html[\s>]/i.test(html)) {
    if (!/<head[\s>]/i.test(html)) {
      return html.replace(/<html([^>]*)>/i, (open) => `${open}<head>${CSP_META}</head>`);
    }
    return html;
  }

  return `<!doctype html><html><head>${CSP_META}</head><body>${html}</body></html>`;
}

export function prepareJarvisPreviewHtml(html: string, options?: JarvisPreviewPrepareOptions) {
  if (options?.streaming) {
    return wrapStreamingPreviewHtml(html);
  }

  const sanitizedHtml = safeSanitizeHtml(html);

  if (/<head[\s>]/i.test(sanitizedHtml)) {
    return sanitizedHtml.replace(/<head([^>]*)>/i, (head) => `${head}\n${CSP_META}`);
  }

  return `<!doctype html><html><head>${CSP_META}</head><body>${sanitizedHtml}</body></html>`;
}

export function getJarvisPreviewHtml(
  messages: Pick<JarvisMessage, "role" | "content">[],
  options?: JarvisPreviewPrepareOptions,
) {
  const htmlArtifact = extractJarvisHtmlArtifact(messages);
  return htmlArtifact ? prepareJarvisPreviewHtml(htmlArtifact, options) : null;
}

const VIEWPORT_META =
  '<meta name="viewport" content="width=device-width, initial-scale=1" />';

const REPAIR_RESPONSIVE_CSS = `
    *, *::before, *::after { box-sizing: border-box; }
    img, video, section, main { max-width: 100%; }
    button { min-height: 48px; padding: 12px 20px; }
    @media (max-width: 768px) {
      body { padding: 16px; overflow-x: hidden; }
    }`;

const REPAIR_BUTTON_SCRIPT = `<script>
document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
  anchor.addEventListener("click", function (event) {
    var href = anchor.getAttribute("href");
    if (!href || href === "#") return;
    var target = document.getElementById(href.slice(1));
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});
document.querySelectorAll("button").forEach(function (button) {
  if (button.dataset.jarvisBound === "1") return;
  button.dataset.jarvisBound = "1";
  button.addEventListener("click", function () {
    button.classList.toggle("is-active");
  });
});
</script>`;

/** Best-effort fixes for truncated or incomplete builder HTML before evaluation. */
export function repairJarvisHtmlArtifact(html: string): string {
  let repaired = html.trim();
  if (!repaired) return repaired;

  const lower = repaired.toLowerCase();

  if (!lower.includes("<!doctype html") && !lower.includes("<html")) {
    repaired = `<!DOCTYPE html><html><head>${VIEWPORT_META}<style>${REPAIR_RESPONSIVE_CSS}\n  </style></head><body>${repaired}</body></html>`;
  }

  const lowerAfterWrap = repaired.toLowerCase();

  if (
    !lowerAfterWrap.includes('name="viewport"') &&
    !lowerAfterWrap.includes("name='viewport'")
  ) {
    if (/<head[^>]*>/i.test(repaired)) {
      repaired = repaired.replace(/<head([^>]*)>/i, `<head$1>\n  ${VIEWPORT_META}`);
    }
  }

  if (!/@media\s*\([^)]*max-width/i.test(repaired)) {
    if (/<style[^>]*>/i.test(repaired)) {
      repaired = repaired.replace(/<\/style>/i, `${REPAIR_RESPONSIVE_CSS}\n  </style>`);
    } else if (/<head[^>]*>/i.test(repaired)) {
      repaired = repaired.replace(
        /<head([^>]*)>/i,
        `<head$1>\n  <style>${REPAIR_RESPONSIVE_CSS}\n  </style>`,
      );
    }
  }

  repaired = repaired.replace(
    /\b(?:width|min-width)\s*:\s*(\d{4,})\s*px/gi,
    "max-width: 100%",
  );

  const lowerBeforeClose = repaired.toLowerCase();
  if (!lowerBeforeClose.includes("<script") && /<button\b/i.test(repaired)) {
    if (/<\/body>/i.test(repaired)) {
      repaired = repaired.replace(/<\/body>/i, `${REPAIR_BUTTON_SCRIPT}\n</body>`);
    } else {
      repaired += `\n${REPAIR_BUTTON_SCRIPT}`;
    }
  }

  const lowerFinal = repaired.toLowerCase();
  if (!lowerFinal.includes("</html>")) {
    if (!lowerFinal.includes("</body>")) {
      repaired += lowerFinal.includes("<body") ? "\n</body>" : "\n<body></body>";
    }
    repaired += "\n</html>";
  }

  return repaired;
}

export function applyJarvisHtmlRepairToAssistantContent(content: string): {
  content: string;
  html: string | null;
  changed: boolean;
} {
  const html = extractJarvisHtmlArtifact([{ role: "assistant", content }]);
  if (!html) {
    return { content, html: null, changed: false };
  }

  const repairedHtml = repairJarvisHtmlArtifact(html);
  if (repairedHtml === html) {
    return { content, html, changed: false };
  }

  const trimmed = content.trim();
  const fenceMatch = trimmed.match(HTML_FENCE_PATTERN);
  if (fenceMatch) {
    const repairedContent = trimmed.replace(
      HTML_FENCE_PATTERN,
      `\`\`\`html\n${repairedHtml}\n\`\`\``,
    );
    return { content: repairedContent, html: repairedHtml, changed: true };
  }

  const htmlStart = trimmed.search(FULL_HTML_PATTERN);
  if (htmlStart >= 0) {
    const prefix = trimmed.slice(0, htmlStart);
    const suffix = trimmed.slice(htmlStart + html.length);
    return {
      content: `${prefix}${repairedHtml}${suffix}`,
      html: repairedHtml,
      changed: true,
    };
  }

  return { content, html: repairedHtml, changed: true };
}

export function validateJarvisHtmlArtifact(html: string | null): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!html?.trim()) {
    return { ok: false, issues: ["Chýba HTML artifact"] };
  }

  const lower = html.toLowerCase();
  if (!lower.includes("<!doctype html") && !lower.includes("<html")) {
    issues.push("Chýba <!DOCTYPE html> alebo <html>");
  }
  if (!lower.includes("</html>")) {
    issues.push("Dokument je useknutý — chýba </html>");
  }
  if (!lower.includes("<style") && !lower.includes(" style=")) {
    issues.push("Chýba CSS");
  }
  if (!lower.includes("<script")) {
    issues.push("Chýba <script> — buttony pravdepodobne nebudú fungovať");
  }
  if (html.includes('href="#') && !lower.includes('id="')) {
    issues.push("Navigácia má anchor linky bez id sekcií");
  }

  return { ok: issues.length === 0, issues };
}
