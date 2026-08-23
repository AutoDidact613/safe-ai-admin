/**
 * User documents are frequently read with .lean(), which bypasses the User
 * model's toJSON transform. Any user object heading into an HTTP response
 * must be run through this first so secrets never leave the server.
 */

const SENSITIVE_USER_FIELDS = [
  "password",
  "proxyKeyHash",
  "litellmKeyEncrypted",
  "litellmToken",
  "verificationToken",
  "verificationTokenExpires",
  "passwordResetToken",
  "passwordResetExpires",
  "refreshTokens",
  "__v",
] as const;

export function sanitizeUser<T extends Record<string, unknown> | null | undefined>(user: T): T {
  if (!user) return user;

  const clean = { ...user } as Record<string, unknown>;
  for (const field of SENSITIVE_USER_FIELDS) {
    delete clean[field];
  }
  return clean as T;
}
