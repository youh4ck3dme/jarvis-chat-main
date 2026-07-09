import type { BuildPlan } from "@/types/build";

export const DEFAULT_STORYBOARD_SECTIONS = ["hero", "navigation", "features", "contact", "footer"];

export type StoryboardPlanningStep = {
  cardIndex: number;
  statusMessage: string;
  kind: "section" | "meta";
};

export const STORYBOARD_PLANNING_STEPS: StoryboardPlanningStep[] = [
  { cardIndex: 0, statusMessage: "Analyzujem tvoju víziu…", kind: "section" },
  { cardIndex: 0, statusMessage: "Pridávam hero sekciu…", kind: "section" },
  { cardIndex: 1, statusMessage: "Skladám navigáciu…", kind: "section" },
  { cardIndex: 2, statusMessage: "Pridávam obsahové bloky…", kind: "section" },
  { cardIndex: 3, statusMessage: "Pridávam kontakt…", kind: "section" },
  { cardIndex: 4, statusMessage: "Dopĺňam pätičku…", kind: "section" },
  { cardIndex: -1, statusMessage: "Vyberám farbu…", kind: "meta" },
  { cardIndex: -1, statusMessage: "Nastavujem CTA…", kind: "meta" },
  { cardIndex: -1, statusMessage: "Finalizujem plán…", kind: "meta" },
];

export const STORYBOARD_STEP_INTERVAL_MS = 650;

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  navigation: "Menu",
  nav: "Menu",
  menu: "Menu",
  about: "About",
  features: "Features",
  contact: "Contact",
  footer: "Footer",
  pricing: "Pricing",
  faq: "FAQ",
  gallery: "Gallery",
  testimonials: "Reviews",
};

export function formatSectionLabel(section: string): string {
  const key = section.toLowerCase().trim();
  if (SECTION_LABELS[key]) return SECTION_LABELS[key];
  return section.charAt(0).toUpperCase() + section.slice(1);
}

export function resolveStoryboardSections(plan: BuildPlan | null): string[] {
  if (plan?.sections?.length) return plan.sections;
  return DEFAULT_STORYBOARD_SECTIONS;
}

export function storyboardStatusFromPlan(plan: BuildPlan): string {
  const parts = [
    plan.summary,
    plan.primaryColor ? `Farba ${plan.primaryColor}` : null,
    plan.ctaLabel ? `CTA „${plan.ctaLabel}"` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}