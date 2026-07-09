import { beforeEach, describe, expect, it } from "vitest"

import {
  BUILD_EXPERIENCE_STORAGE_KEY,
  getExperienceHint,
  hasFrequentScriptIssues,
  readExperienceHint,
  recordBuildEvaluation,
} from "./build-experience"

describe("build-experience", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns hint when more than half of recent builds miss script", () => {
    const entries = [
      { recordedAt: "1", evaluation: { ok: false, score: 0.4, issues: ["Chýba <script>"], shouldRefine: true } },
      { recordedAt: "2", evaluation: { ok: false, score: 0.5, issues: ["Chýba <script>"], shouldRefine: true } },
      { recordedAt: "3", evaluation: { ok: true, score: 0.9, issues: [], shouldRefine: false } },
    ]

    expect(hasFrequentScriptIssues(entries)).toBe(true)
    expect(getExperienceHint(entries)).toMatch(/inline <script>/i)
  })

  it("reads experience hint from localStorage history", () => {
    for (let index = 0; index < 10; index += 1) {
      recordBuildEvaluation({
        ok: false,
        score: 0.4,
        issues: index < 7 ? ["Chýba <script>"] : [],
        shouldRefine: index < 7,
      })
    }

    expect(readExperienceHint()).toMatch(/inline <script>/i)
  })

  it("stores only the latest ten evaluations", () => {
    for (let index = 0; index < 12; index += 1) {
      recordBuildEvaluation({
        ok: index % 2 === 0,
        score: 0.5,
        issues: [],
        shouldRefine: false,
      })
    }

    const stored = JSON.parse(localStorage.getItem(BUILD_EXPERIENCE_STORAGE_KEY) ?? "[]")
    expect(stored).toHaveLength(10)
  })
})