/**
 * Shared owner/admin access check for organization-scoped routes. Previously
 * hand-copied in organizationController.ts across ~9 handlers, sometimes as
 * `ownerId?._id ?? ownerId` and sometimes as a ternary of the same logic -
 * centralized so a future change to the admin-bypass rule only needs to
 * happen in one place (SCRUM-320).
 */

interface OwnedByOrganization {
  ownerId: { _id?: unknown } | unknown;
}

interface RequestingUser {
  role: string;
  userId: string;
}

export function getOrganizationOwnerId(organization: OwnedByOrganization): string {
  const ownerId = (organization.ownerId as any)?._id ?? organization.ownerId;
  return ownerId.toString();
}

export function isOrganizationAccessAllowed(
  user: RequestingUser,
  organization: OwnedByOrganization
): boolean {
  return user.role === "admin" || getOrganizationOwnerId(organization) === user.userId;
}
