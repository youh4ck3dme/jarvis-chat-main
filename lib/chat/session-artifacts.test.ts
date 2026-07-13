import { describe, expect, it } from "vitest"

import {
  createSessionArtifact,
  deriveArtifactTitle,
  extractPageAnnotation,
  findArtifactBySlug,
  getActiveArtifact,
  normalizeSessionArtifacts,
  parsePageArtifactsFromContent,
  slugifyArtifactSlug,
} from "./session-artifacts"

describe("session-artifacts", () => {
  it("slugifies and reads page annotations", () => {
    expect(slugifyArtifactSlug("About Us")).toBe("about-us")
    expect(extractPageAnnotation("<!-- page:about -->\n<html></html>")).toBe("about")
    expect(deriveArtifactTitle("<title>Pricing</title>", "pricing")).toBe("Pricing")
  })

  it("parses multi-page assistant content with annotations", () => {
    const content = [
      "Done:",
      "```html",
      "<!-- page:index -->",
      "<!doctype html><html><head><title>Home</title></head><body><a href=\"about.html\">About</a></body></html>",
      "```",
      "```html",
      "<!-- page:about -->",
      "<!doctype html><html><head><title>About</title></head><body><h1>About</h1></body></html>",
      "```",
    ].join("\n")

    const pages = parsePageArtifactsFromContent(content, "2026-07-13T12:00:00.000Z")
    expect(pages).toHaveLength(2)
    expect(pages[0]).toMatchObject({ slug: "index", title: "Home" })
    expect(pages[1]).toMatchObject({ slug: "about", title: "About" })
  })

  it("falls back to page-N when annotation is missing", () => {
    const content = "```html\n<html><body>One</body></html>\n```\n```html\n<html><body>Two</body></html>\n```"
    const pages = parsePageArtifactsFromContent(content)
    expect(pages.map((page) => page.slug)).toEqual(["index", "page-2"])
  })

  it("normalizes legacy sessions and resolves active artifact", () => {
    const { artifacts, activeArtifactId } = normalizeSessionArtifacts(undefined, null, "<html>legacy</html>")
    expect(artifacts).toHaveLength(1)
    expect(artifacts[0]?.slug).toBe("index")
    expect(activeArtifactId).toBe(artifacts[0]?.id)

    expect(getActiveArtifact(artifacts, activeArtifactId)?.html).toContain("legacy")
    expect(findArtifactBySlug(artifacts, "index.html")?.id).toBe(artifacts[0]?.id)
  })

  it("creates artifacts with stable fields", () => {
    const artifact = createSessionArtifact({
      html: "<!-- page:pricing -->\n<title>Plans</title><h1>Plans</h1>",
      createdAt: "2026-07-13T12:00:00.000Z",
    })
    expect(artifact.slug).toBe("pricing")
    expect(artifact.title).toBe("Plans")
  })
})
