/** Dev-only fallback when BUILDER_UNLOCK_PASSWORD is not configured locally. */
export const DEV_BUILDER_PASSWORD_FALLBACK = "23513900";

export function isDevelopmentRuntime(): boolean {
  return process.env.NODE_ENV === "development";
}

export function resolveBuilderPassword(): string | null {
  const fromServer = process.env.BUILDER_UNLOCK_PASSWORD?.trim();
  if (fromServer) return fromServer;

  if (isDevelopmentRuntime()) {
    return DEV_BUILDER_PASSWORD_FALLBACK;
  }

  return null;
}

export function isBuilderUnlockConfigured(): boolean {
  return resolveBuilderPassword() !== null;
}

export function isBuilderPasswordValid(password: string): boolean {
  const expected = resolveBuilderPassword();
  if (!expected) return false;
  return password.trim() === expected;
}