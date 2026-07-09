import "@/lib/env";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { isBuilderPasswordValid, isBuilderUnlockConfigured } from "@/lib/builder-unlock";

export async function POST(req: Request) {
  try {
    if (!isBuilderUnlockConfigured()) {
      return jsonError(
        "Builder unlock nie je nakonfigurovaný. Nastav BUILDER_UNLOCK_PASSWORD vo Vercel Environment Variables.",
        503,
      );
    }

    const { password } = await req.json();

    if (!password || typeof password !== "string") {
      return jsonError("Invalid request: password required", 400);
    }

    if (!isBuilderPasswordValid(password)) {
      return jsonError("Nesprávne heslo. Builder režim je chránený.", 401);
    }

    return jsonSuccess({ unlocked: true });
  } catch (error) {
    console.error("Builder unlock API error:", error);
    return jsonError(error instanceof Error ? error.message : "An unexpected error occurred", 500);
  }
}