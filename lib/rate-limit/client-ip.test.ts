import { describe, expect, it } from "vitest"

import { getClientIp } from "./client-ip"

describe("getClientIp", () => {
  it("prefers the first x-forwarded-for hop", () => {
    const request = new Request("http://localhost/api/builder/unlock", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    })

    expect(getClientIp(request)).toBe("203.0.113.10")
  })

  it("falls back to x-real-ip", () => {
    const request = new Request("http://localhost/api/builder/unlock", {
      headers: { "x-real-ip": "198.51.100.4" },
    })

    expect(getClientIp(request)).toBe("198.51.100.4")
  })

  it("returns unknown when no proxy headers are present", () => {
    expect(getClientIp(new Request("http://localhost/api/builder/unlock"))).toBe("unknown")
  })
})