export function resolveBuilderPassword(): string | null {
  const fromServer = process.env.BUILDER_UNLOCK_PASSWORD?.trim();
  if (fromServer) return fromServer;

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