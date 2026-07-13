import { DiffDOM, stringToObj } from "diff-dom"

import {
  diffJarvisText,
  summarizeJarvisDiff,
  type JarvisTextDiffLine,
} from "@/copied-from-visual-html/lib/jarvis-workspace"

export type SnapshotDiffSummary = {
  textSummary: string
  textLines: JarvisTextDiffLine[]
  addedNodes: number
  removedNodes: number
}

function extractBodyMarkup(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (match?.[1]) return `<body>${match[1]}</body>`
  return `<body>${html}</body>`
}

function countNodeActions(diff: Array<{ action?: string }>): {
  addedNodes: number
  removedNodes: number
} {
  let addedNodes = 0
  let removedNodes = 0

  for (const entry of diff) {
    const action = entry.action ?? ""
    if (
      action === "addElement" ||
      action === "addTextElement" ||
      action === "modifyTextElement" ||
      action === "replaceElement"
    ) {
      addedNodes += 1
    } else if (action === "removeElement" || action === "removeTextElement") {
      removedNodes += 1
    }
  }

  return { addedNodes, removedNodes }
}

/**
 * Build a combined text + DOM snapshot compare summary for A/B UI.
 * Uses existing line diff helpers and diff-dom against parsed body markup.
 */
export function compareSnapshotHtml(beforeHtml: string, afterHtml: string): SnapshotDiffSummary {
  const textLines = diffJarvisText(beforeHtml, afterHtml)
  const textSummary = summarizeJarvisDiff(beforeHtml, afterHtml)

  let addedNodes = 0
  let removedNodes = 0

  try {
    const dd = new DiffDOM()
    const beforeObj = stringToObj(extractBodyMarkup(beforeHtml || ""))
    const afterObj = stringToObj(extractBodyMarkup(afterHtml || ""))
    const diff = dd.diff(beforeObj, afterObj) as Array<{ action?: string }>
    ;({ addedNodes, removedNodes } = countNodeActions(diff))
  } catch {
    // Diff DOM is best-effort; keep text summary.
  }

  return {
    textSummary,
    textLines,
    addedNodes,
    removedNodes,
  }
}
