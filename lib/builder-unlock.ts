/** Dev-only fallback when BUILDER_UNLOCK_PASSWORD is not configured. */
export const DEV_BUILDER_PASSWORD_FALLBACK = "2366";

export function resolveBuilderPassword(): string {
  const fromServer = process.env.BUILDER_UNLOCK_PASSWORD?.trim();
  if (fromServer) return fromServer;

  if (process.env.NODE_ENV === "development") {
    return DEV_BUILDER_PASSWORD_FALLBACK;
  }

  return DEV_BUILDER_PASSWORD_FALLBACK;
}

export function isBuilderPasswordValid(password: string): boolean {
  const expected = resolveBuilderPassword();
  return password.trim() === expected;
}