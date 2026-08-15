import { describe, expect, it } from "vitest"

import {
  extractSlugCandidateFromHref,
  isInternalArtifactHref,
  parseArtifactNavigateMessage,
  resolveArtifactFromHref,
} from "./artifact-router"
import { createSessionArtifact } from "./chat/session-artifacts"

describe("artifact-router", () => {
  const artifacts = [
    createSessionArtifact({ html: "<title>Home</title>", slug: "index" }),
    createSessionArtifact({ html: "<title>About</title>", slug: "about" }),
  ]

  it("detects internal hrefs and rejects external ones", () => {
    expect(isInternalArtifactHref("about.html")).toBe(true)
    expect(isInternalArtifactHref("./pricing.html")).toBe(true)
    expect(isInternalArtifactHref("#section")).toBe(false)
    expect(isInternalArtifactHref("https://example.com")).toBe(false)
    expect(isInternalArtifactHref("mailto:hi@example.com")).toBe(false)
  })

  it("extracts slugs and resolves artifacts", () => {
    expect(extractSlugCandidateFromHref("about.html")).toBe("about")
    expect(extractSlugCandidateFromHref("./index.html")).toBe("index")
    expect(resolveArtifactFromHref("about.html", artifacts)?.slug).toBe("about")
    expect(resolveArtifactFromHref("missing.html", artifacts)).toBeNull()
  })

  it("parses postMessage navigate payloads", () => {
    const entry = parseArtifactNavigateMessage({
      type: "pngto-preview-artifact-navigate",
      href: "about.html",
      slug: "about",
      ts: 42,
    })
    expect(entry).toMatchObject({ href: "about.html", slug: "about", ts: 42 })
  })
})
