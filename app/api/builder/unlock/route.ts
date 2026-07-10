import { jsonError, jsonSuccess } from "@/lib/api-response";
import { checkBuilderUnlockRateLimit } from "@/lib/builder-unlock-rate-limit";
import { isBuilderPasswordValid, isBuilderUnlockConfigured } from "@/lib/builder-unlock";

export async function POST(req: Request) {
  try {
    const rateLimit = checkBuilderUnlockRateLimit(req);
    if (!rateLimit.allowed) {
      return jsonError(
        "Príliš veľa pokusov o odomknutie. Skús znova neskôr.",
        429,
        {
          "Retry-After": String(rateLimit.retryAfterSec),
          "X-RateLimit-Remaining": "0",
        },
      );
    }

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
      return jsonError("Nesprávne heslo. Builder režim je chránený.", 401, {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      });
    }

    return jsonSuccess({ unlocked: true }, 200);
  } catch (error) {
    console.error("Builder unlock API error:", error);
    return jsonError(error instanceof Error ? error.message : "An unexpected error occurred", 500);
  }
}