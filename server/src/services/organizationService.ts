import * as repo from "../repositories/organizationRepository";
import * as userRepo from "../repositories/userRepository";
import { UsageLog } from "../models";
import { sendOrgApprovalRequestEmail } from "../utils/email";
import logger from "../logger";

export async function createOrganization(data: any) {
  try {
    // Verify that the owner exists and update their role
    const owner = await userRepo.getUserById(data.ownerId);
    if (!owner) {
      throw new Error("Owner user not found");
    }

    // Create the organization
    const organization = await repo.createOrganization(data);

    // Update the owner's role to org_owner (unless they're already admin) and link to organization
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
    // Get all users in this organization
    const users = await userRepo.getUsers();
    const orgUsers = users.filter((u: any) => u.organizationId?.toString() === orgId);

    // Remove organization reference from all users
    for (const user of orgUsers) {
      await userRepo.updateUser(user._id.toString(), {
        organizationId: null,
        role: user.role === "org_owner" ? "user" : user.role,
      });
    }

    // Delete the organization
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
    const users = await userRepo.getUsers();
    return users.filter((u: any) => u.organizationId?.toString() === orgId);
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

    // Update user's organization and role
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

export async function removeUserFromOrganization(userId: string) {
  try {
    const user = await userRepo.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Remove organization reference
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

export async function topUpOrganizationWallet(orgId: string, amount: number) {
  try {
    const organization = await repo.getOrganizationById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const currentBalance = (organization as any).walletBalance || 0;
    const newBalance = currentBalance + amount;

    const updateOrg = await repo.updateOrganization(orgId, {
      walletBalance: newBalance,
    });

    logger.info("Organization wallet topped up successfully (Mock)", {
      orgId,
      amount,
      newBalance,
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

export async function requestOrganization(
  ownerId: string,
  data: { name: string; description?: string }
) {
  const owner = await userRepo.getUserById(ownerId);
  if (!owner) {
    throw new Error("User not found");
  }

  // יצירת הארגון במצב ממתין ולא פעיל
  const organization = await repo.createOrganization({
    name: data.name,
    description: data.description || "",
    ownerId,
    status: "pending",
    isActive: false,
  });

  // סימון היוצר כבעל הארגון וקישורו (הגישה נשלטת לפי status)
  await userRepo.updateUser(ownerId, {
    role: owner.role === "admin" ? "admin" : "org_owner",
    organizationId: organization._id,
  });

  logger.info("Organization request created", {
    organizationId: organization._id,
    ownerId,
    status: "pending",
  });

  // התראה לכל האדמינים (best-effort)
  try {
    const users = await userRepo.getUsers();
    const admins = users.filter((u: any) => u.role === "admin");
    await Promise.all(
      admins.map((admin: any) =>
        sendOrgApprovalRequestEmail(admin.email, data.name, owner.email)
      )
    );
  } catch (error) {
    logger.error("Failed to notify admins about org request", { error });
  }

  return organization;
}

export async function listAllOrganizationsWithStats() {
  return repo.getOrganizationsWithUserCount();
}

export async function setOrganizationActive(orgId: string, isActive: boolean) {
  const organization = await repo.getOrganizationById(orgId);
  if (!organization) {
    throw new Error("Organization not found");
  }

  const updated = await repo.updateOrganization(orgId, { isActive });
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