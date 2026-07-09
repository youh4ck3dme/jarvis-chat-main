import { afterEach, describe, expect, it, vi } from "vitest"

import { requestBuilderUnlock } from "./builder-unlock-client"

describe("builder-unlock-client", () => {
  const fetchMock = vi.fn()

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("returns ok when the API accepts the password", async () => {
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { unlocked: true } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    )

    await expect(requestBuilderUnlock("2366")).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/builder/unlock",
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("returns server error message for invalid password", async () => {
    vi.stubGlobal(
      "fetch",
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "Nesprávne heslo. Builder režim je chránený.",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    )

    await expect(requestBuilderUnlock("bad")).resolves.toEqual({
      ok: false,
      error: "Nesprávne heslo. Builder režim je chránený.",
    })
  })
})