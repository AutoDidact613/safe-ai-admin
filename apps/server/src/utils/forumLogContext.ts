import { User } from "../models/user";

/**
 * Best-effort organizationId lookup for structured forum error logs.
 * organizationId isn't in the JWT payload (only userId/email/role are), so
 * logging it requires this extra read. Never throws - a lookup failure just
 * leaves the field undefined in the log entry instead of crashing the error
 * handler that's already dealing with a different failure.
 */
export async function getOrganizationIdForLog(userId?: string): Promise<string | undefined> {
  if (!userId) return undefined;

  try {
    const user = await User.findById(userId).select("organizationId").lean();
    return user?.organizationId ? String(user.organizationId) : undefined;
  } catch {
    return undefined;
  }
}
