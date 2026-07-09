import { formatSectionLabel } from "@/lib/chat/storyboard-strip";
import type { BuildPlan } from "@/types/build";

export type MindMapNode = {
  id: string;
  label: string;
  kind: "section" | "color" | "cta" | "idle";
};

export const ORB_PLANNING_NODE_SEQUENCE: MindMapNode[] = [
  { id: "hero", label: "Hero", kind: "section" },
  { id: "navigation", label: "Menu", kind: "section" },
  { id: "features", label: "Features", kind: "section" },
  { id: "contact", label: "Contact", kind: "section" },
  { id: "color", label: "Farba", kind: "color" },
  { id: "cta", label: "CTA", kind: "cta" },
];

export const ORB_NODE_REVEAL_INTERVAL_MS = 700;

export function buildMindMapNodesFromPlan(plan: BuildPlan): MindMapNode[] {
  const nodes: MindMapNode[] = plan.sections.map((section) => ({
    id: section,
    label: formatSectionLabel(section),
    kind: "section",
  }));

  if (plan.primaryColor) {
    nodes.push({
      id: "color",
      label: plan.primaryColor,
      kind: "color",
    });
  }

  if (plan.ctaLabel) {
    nodes.push({
      id: "cta",
      label: plan.ctaLabel,
      kind: "cta",
    });
  }

  return nodes;
}

export function getOrbitPosition(index: number, total: number, radius: number): { x: number; y: number } {
  if (total <= 0) return { x: 0, y: 0 };
  const angle = (index / total) * 360 - 90;
  const rad = (angle * Math.PI) / 180;
  return {
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius,
  };
}