import crypto from "crypto";
import * as repo from "../repositories/organizationRepository";
import * as userRepo from "../repositories/userRepository";
import { UsageLog } from "../models";
import { register } from "./authService";
import * as providerKeyService from "./providerKeyService";
import { sendOrgApprovalRequestEmail, sendOrgApprovedEmail, sendOrgStatusEmail } from "../utils/email";
import logger from "../logger";

function generateTemporaryPassword(): string {
  return crypto.randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
}

export async function createOrganization(data: any) {
  try {
    const owner = await userRepo.getUserById(data.ownerId);
    if (!owner) {
      throw new Error("Owner user not found");
    }

    const organization = await repo.createOrganization(data);

    await userRepo.updateUser(data.ownerId, {
      role: owner.role === "admin" ? "admin" : "org_owner",
      organizationId: organization._id,
    });

    logger.info("Organization created", {
      organizationId: organization._id,
      ownerId: data.ownerId,
    });

    return organization;
  } catch (error) {
    logger.error("Failed to create organization", { error });
    throw error;
  }
}

export async function listOrganizations() {
  return repo.getOrganizations();
}

export async function getOrganizationById(orgId: string) {
  return repo.getOrganizationById(orgId);
}

export async function getOrganizationsByOwnerId(ownerId: string) {
  return repo.getOrganizationsByOwnerId(ownerId);
}

export async function updateOrganization(orgId: string, data: any) {
  return repo.updateOrganization(orgId, data);
}

export async function deleteOrganization(orgId: string) {
  try {
    await userRepo.removeUsersFromOrganization(orgId);

    const result = await repo.deleteOrganization(orgId);

    logger.info("Organization deleted", { organizationId: orgId });

    return result;
  } catch (error) {
    logger.error("Failed to delete organization", { error });
    throw error;
  }
}

export async function getOrganizationUsers(orgId: string) {
  try {
    return await userRepo.getUsersByOrganization(orgId);
  } catch (error) {
    logger.error("Failed to get organization users", { error });
    throw error;
  }
}

export async function addUserToOrganization(orgId: string, userId: string, role: string = "user") {
  try {
    const organization = await repo.getOrganizationById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const user = await userRepo.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const alreadyInOrg = (user as any).organizationId?.toString() === orgId;
    if (!alreadyInOrg) {
      const maxUsers = (organization as any).settings?.maxUsers ?? 10;
      const currentUserCount = await userRepo.countUsersByOrganization(orgId);
      if (currentUserCount >= maxUsers) {
        throw new Error(`הארגון הגיע למספר המשתמשים המרבי המותר (${maxUsers})`);
      }
    }

    await userRepo.updateUser(userId, {
      organizationId: orgId,
      role: role,
    });

    logger.info("User added to organization", { userId, orgId, role });

    return user;
  } catch (error) {
    logger.error("Failed to add user to organization", { error });
    throw error;
  }
}

export async function getOrganizationForUser(userId: string) {
  const user = await userRepo.getUserById(userId);
  if (!user || !(user as any).organizationId) {
    return null;
  }
  return repo.getOrganizationById((user as any).organizationId.toString());
}

export async function removeUserFromOrganization(userId: string) {
  try {
    const user = await userRepo.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    await userRepo.updateUser(userId, {
      organizationId: null,
    });

    logger.info("User removed from organization", { userId });

    return user;
  } catch (error) {
    logger.error("Failed to remove user from organization", { error });
    throw error;
  }
}

export async function addUserToOrganizationByEmail(
  orgId: string,
  email: string,
  role: string = "user"
) {
  const user = await userRepo.findUserByEmail(email.toLowerCase().trim());
  if (!user) {
    throw new Error("User not found");
  }

  return addUserToOrganization(orgId, user._id.toString(), role);
}

export async function createOrganizationMember(
  orgId: string,
  data: { name: string; email: string; role?: string; mode?: "BYOK" | "MANAGED" | "MANAGED_ORG" }
) {
  try {
    const organization = await repo.getOrganizationById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const maxUsers = (organization as any).settings?.maxUsers ?? 10;
    const currentUserCount = await userRepo.countUsersByOrganization(orgId);
    if (currentUserCount >= maxUsers) {
      throw new Error(`הארגון הגיע למספר המשתמשים המרבי המותר (${maxUsers})`);
    }

    const temporaryPassword = generateTemporaryPassword();

    const { user } = await register({
      email: data.email,
      password: temporaryPassword,
      name: data.name,
      organizationId: orgId,
      role: data.role || "user",
      ...(data.mode && { mode: data.mode }),
      skipEmailVerification: true,
    });

    logger.info("Organization member created", { orgId, userId: user._id });

    return { user, temporaryPassword };
  } catch (error) {
    logger.error("Failed to create organization member", { error, orgId });
    throw error;
  }
}

export async function topUpOrganizationWallet(orgId: string, amount: number) {
  try {
    const organization = await repo.getOrganizationById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const updateOrg = await repo.incrementWalletBalance(orgId, amount);

    logger.info("Organization wallet topped up successfully (Mock)", {
      orgId,
      amount,
      newBalance: (updateOrg as any)?.walletBalance,
    });

    return updateOrg;
  } catch (error) {
    logger.error("Failed to top up organization wallet", { error });
    throw error;
  }
}

export async function getPendingOrganizationsForAdmin() {
  return repo.getPendingOrganizations();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function publicRequestOrganization(data: {
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  orgName: string;
  orgDescription?: string;
}) {
  if (!EMAIL_REGEX.test(data.ownerEmail)) {
    throw new Error("כתובת האימייל אינה תקינה");
  }

  const existingOrg = await repo.findOrganizationByName(data.orgName);
  if (existingOrg) {
    throw new Error("שם הארגון כבר תפוס, אנא בחרו שם אחר");
  }

  const { user } = await register({
    email: data.ownerEmail,
    password: data.ownerPassword,
    name: data.ownerName,
    role: "org_owner",
    skipEmailVerification: true,
  });

  let organization;
  try {
    organization = await repo.createOrganization({
      name: data.orgName,
      description: data.orgDescription || "",
      ownerId: user._id,
      status: "pending",
      isActive: false,
    });
  } catch (error: any) {
    await userRepo.deleteUser(user._id.toString());
    if (error?.code === 11000) {
      throw new Error("שם הארגון כבר תפוס, אנא בחרו שם אחר");
    }
    throw error;
  }

  await userRepo.updateUser(user._id.toString(), {
    organizationId: organization._id,
  });

  logger.info("Public organization request created", {
    organizationId: organization._id,
    ownerEmail: data.ownerEmail,
  });

  try {
    const users = await userRepo.getUsers();
    const admins = users.filter((u: any) => u.role === "admin");
    await Promise.all(
      admins.map((admin: any) =>
        sendOrgApprovalRequestEmail(admin.email, data.orgName, data.ownerEmail)
      )
    );
  } catch (error) {
    logger.error("Failed to notify admins about org request", { error });
  }

  return organization;
}

export async function approveOrganization(orgId: string) {
  const organization = await repo.getOrganizationById(orgId);
  if (!organization) {
    throw new Error("Organization not found");
  }
  if ((organization as any).status !== "pending") {
    throw new Error(`ניתן לאשר רק ארגון שממתין לאישור (מצב נוכחי: ${(organization as any).status})`);
  }

  const updated = await repo.updateOrganization(orgId, {
    status: "approved",
    isActive: true,
  });

  try {
    const owner = organization.ownerId as any;
    if (owner?.email) {
      await sendOrgApprovedEmail(owner.email, (organization as any).name, owner.name);
    }
  } catch (error) {
    logger.error("Failed to send org approved email", { error });
  }

  logger.info("Organization approved", { orgId });
  return updated;
}

export async function rejectOrganization(orgId: string) {
  const organization = await repo.getOrganizationById(orgId);
  if (!organization) {
    throw new Error("Organization not found");
  }
  if ((organization as any).status !== "pending") {
    throw new Error(`ניתן לדחות רק ארגון שממתין לאישור (מצב נוכחי: ${(organization as any).status})`);
  }

  const updated = await repo.updateOrganization(orgId, {
    status: "rejected",
    isActive: false,
  });

  try {
    const owner = organization.ownerId as any;
    if (owner?.email) {
      await sendOrgStatusEmail("rejected", owner.email, (organization as any).name, owner.name);
    }
  } catch (error) {
    logger.error("Failed to send org rejected email", { error });
  }

  logger.info("Organization rejected", { orgId });
  return updated;
}

export async function getMyOrganization(userId: string) {
  const user = await userRepo.getUserById(userId);
  if (!user || !user.organizationId) {
    return null;
  }
  return repo.getOrganizationById(user.organizationId.toString());
}

export async function listAllOrganizationsWithStats() {
  return repo.getOrganizationsWithUserCount();
}

export async function setOrganizationActive(orgId: string, isActive: boolean) {
  const organization = await repo.getOrganizationById(orgId);
  if (!organization) {
    throw new Error("Organization not found");
  }
  if ((organization as any).status !== "approved") {
    throw new Error(`ניתן להשעות או להפעיל מחדש רק ארגון מאושר (מצב נוכחי: ${(organization as any).status})`);
  }
  if ((organization as any).isActive === isActive) {
    throw new Error(isActive ? "הארגון כבר פעיל" : "הארגון כבר מושעה");
  }

  const updated = await repo.updateOrganization(orgId, { isActive });

  try {
    const owner = organization.ownerId as any;
    if (owner?.email) {
      await sendOrgStatusEmail(
        isActive ? "reactivated" : "suspended",
        owner.email,
        (organization as any).name,
        owner.name
      );
    }
  } catch (error) {
    logger.error("Failed to send org active-state email", { error });
  }

  logger.info("Organization active state changed", { orgId, isActive });
  return updated;
}

export async function getOrganizationUsageSummary(orgId: string) {
  const users = await getOrganizationUsers(orgId);
  const userIds = users.map((u: any) => u._id);

  const stats = await UsageLog.aggregate([
    { $match: { userId: { $in: userIds }, success: true } },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalTokens: { $sum: "$totalTokens" },
        totalCost: { $sum: "$cost" },
      },
    },
  ]);

  const summary = stats[0] || { totalRequests: 0, totalTokens: 0, totalCost: 0 };
  return {
    userCount: users.length,
    totalRequests: summary.totalRequests,
    totalTokens: summary.totalTokens,
    totalCost: summary.totalCost,
  };
}

/**
 * Org-level AI provider key management, used by MANAGED_ORG members
 * (see proxyService.resolveProviderKeyForUser) instead of a personal
 * or system-wide key.
 */
export async function addOrganizationProviderKey(
  organizationId: string,
  data: { provider: string; apiKey: string }
) {
  return providerKeyService.addProviderKey({
    organizationId,
    provider: data.provider,
    apiKey: data.apiKey,
  });
}

export async function listOrganizationProviderKeys(organizationId: string) {
  return providerKeyService.listProviderKeysForOrganization(organizationId);
}

export async function deleteOrganizationProviderKey(
  organizationId: string,
  keyId: string
) {
  const key = await providerKeyService.getProviderKeyById(keyId);
  if (!key || String(key.organizationId) !== String(organizationId)) {
    return null;
  }

  return providerKeyService.deleteProviderKey(keyId);
}