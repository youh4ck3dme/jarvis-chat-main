export const JARVIS_STORY_NUDGE_SHOWN_KEY = "jarvis-story-nudge-shown";
export const JARVIS_STORY_NUDGE_DELAY_MS = 45_000;

/** Opening quote on empty workspace — sets the tone before first message. */
export const JARVIS_STORY_OPENING = `«Pred rokmi som bol len riadok kódu v tmavom termináli. Dnes som tu — aby som počúval, rozumel… a keď budeš pripravený, postavil to, čo si predstavíš.»`;

/** Proactive nudge after idle time in Chat mode. */
export const JARVIS_STORY_NUDGE = `«…a mimochodom — nechcel by si vidieť, čo dokážem? Stačí napísať, čo si praješ postaviť alebo nakódovať. Napríklad: „urob mi landing page pre kaviareň."»`;

export const JARVIS_BUILDER_LOCKED_HINT = `«To znie ako build úloha. Zadaj heslo nižšie — odomkne sa Builder a môžem začať stavať naživo v preview paneli.»`;

export const JARVIS_STORY_BUILD_INTENT = `«Výborne. Najprv si to rozložím v hlave — potom to postavím naživo v preview.»`;

export const JARVIS_STORY_PLAN_READY = `«Plán je hotový. Teraz kódujem — sleduj pravý panel.»`;

export const JARVIS_STORY_BUILD_SUCCESS = `«Hotovo. Môžeš upraviť, exportovať, alebo povedať čo zmeniť.»`;

export type NarrativeBeat = {
  id: string;
  role: "assistant";
  content: string;
  createdAt: Date;
  narrative: true;
};

export function createNarrativeBeat(id: string, content: string, createdAt = new Date()): NarrativeBeat {
  return {
    id,
    role: "assistant",
    content,
    createdAt,
    narrative: true,
  };
}

const BUILD_INTENT_PATTERNS: RegExp[] = [
  /\b(postav|vytvor|urob|sprav|nakoduj|nakóduj|zbuilduj|zbuduj|naprogramuj|implementuj)\b/i,
  /\b(build|create|make|code|develop|generate)\s+(me\s+)?(a|an|the)?\s*(landing|page|site|app|web|ui|html)/i,
  /\b(landing\s*page|webov[aá]\s*str[aá]nk|str[aá]nk[au]|aplik[aá]ci[au]|web\s*str[aá]nk)/i,
  /\b(dizajn|design)\s+(pre|for)\b/i,
  /\bchcem\s+(str[aá]nk|web|app|landing)/i,
  /\bwant\s+(a|an|to\s+build)\b/i,
];

export function detectBuildIntent(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 8) return false;
  return BUILD_INTENT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function readStoryNudgeShown(): boolean {
  if (typeof window === "undefined") return true;
  return window.sessionStorage.getItem(JARVIS_STORY_NUDGE_SHOWN_KEY) === "true";
}

export function markStoryNudgeShown(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(JARVIS_STORY_NUDGE_SHOWN_KEY, "true");
}

export function resetStoryNudgeForTests(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(JARVIS_STORY_NUDGE_SHOWN_KEY);
}