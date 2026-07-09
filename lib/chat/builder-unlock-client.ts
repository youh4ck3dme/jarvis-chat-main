import { readApiErrorMessage } from "@/lib/api-response";

export type BuilderUnlockResult = {
  ok: boolean;
  error?: string;
};

export async function requestBuilderUnlock(password: string): Promise<BuilderUnlockResult> {
  try {
    const response = await fetch("/api/builder/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      return { ok: true };
    }

    let message = "Nesprávne heslo. Builder režim je chránený.";
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      try {
        const payload = await response.json();
        message = readApiErrorMessage(payload) ?? message;
      } catch {
        // keep default message
      }
    }

    return { ok: false, error: message };
  } catch {
    return { ok: false, error: "Nepodarilo sa overiť heslo. Skús znova." };
  }
}