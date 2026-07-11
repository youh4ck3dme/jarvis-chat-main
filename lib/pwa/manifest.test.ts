import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { validateWebManifest, type WebAppManifest } from "./manifest"

const manifestPath = resolve(process.cwd(), "public/site.webmanifest")
const swPath = resolve(process.cwd(), "public/sw.js")

describe("PWA manifest", () => {
  it("site.webmanifest is valid and installable", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as WebAppManifest
    expect(validateWebManifest(manifest)).toEqual([])
    expect(manifest.id).toBe("/chat")
    expect(manifest.scope).toBe("/")
    expect(manifest.display).toBe("standalone")
  })

  it("service worker registers install and fetch handlers", () => {
    const sw = readFileSync(swPath, "utf8")
    expect(sw).toContain('addEventListener("install"')
    expect(sw).toContain('addEventListener("activate"')
    expect(sw).toContain('addEventListener("fetch"')
    expect(sw).toContain("/site.webmanifest")
  })
})