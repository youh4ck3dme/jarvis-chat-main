import { NextResponse } from "next/server";
import { DESKTOP_AGENT_HEALTH_URL } from "@/lib/desktop-agent/constants";

export const dynamic = "force-dynamic";

/**
 * Server-side status proxy route.
 * Performs a health fetch to the local desktop voice agent from the node process.
 * Acts as a CORS-safe backup endpoint for browser status checkouts.
 */
export async function GET() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);

  try {
    const res = await fetch(DESKTOP_AGENT_HEALTH_URL, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ data: null, error: `HTTP ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ data: null, error: msg }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
