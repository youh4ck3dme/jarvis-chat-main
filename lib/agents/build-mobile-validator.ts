export type MobileReadiness = {
  ok: boolean;
  issues: string[];
};

export function evaluateMobileReadiness(html: string | null): MobileReadiness {
  if (!html?.trim()) {
    return { ok: false, issues: ["No HTML artifact for mobile validation"] };
  }

  const issues: string[] = [];
  const lower = html.toLowerCase();

  if (!/@media\s*\([^)]*max-width/i.test(html)) {
    issues.push("Missing @media (max-width) responsive block");
  }

  if (!lower.includes('name="viewport"') && !lower.includes("name='viewport'")) {
    issues.push("Missing viewport meta tag");
  }

  if (/\b(?:width|min-width)\s*:\s*\d{4,}px/i.test(html)) {
    issues.push("Fixed width may overflow mobile viewport (420px)");
  }

  const hasButtons = /<button\b/i.test(html);
  const hasTouchSizing =
    /min-height\s*:\s*(?:4[4-9]|[5-9]\d)\s*px/i.test(html) ||
    /padding\s*:\s*(?:1[2-9]|[2-9]\d)\s*px/i.test(html) ||
    /min-height\s*:\s*2\.75rem/i.test(html);

  if (hasButtons && !hasTouchSizing) {
    issues.push("Buttons may lack touch-friendly sizing (min 44px)");
  }

  return { ok: issues.length === 0, issues };
}