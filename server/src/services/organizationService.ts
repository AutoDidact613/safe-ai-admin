import * as repo from "../repositories/organizationRepository";
import * as userRepo from "../repositories/userRepository";
import logger from "../logger";
import { updateUser } from "../repositories/userRepository";

export async function createOrganization(data: any) {
  try {
    // Verify that the owner exists and update their role
    const owner = await userRepo.getUserById(data.ownerId);
    if (!owner) {
      throw new Error("Owner user not found");
    }

    // Create the organization
    const organization = await repo.createOrganization({
      ...data,
      status: "pending",
      isActive: false,
    });

    // המשתמש יקבל role של org_owner רק לאחר אישור הארגון

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

export async function approveOrganization(orgId: string) {
  const organization = await repo.updateOrganization(orgId, {
    status: "approved",
    isActive: true,
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  await updateUser(organization.ownerId.toString(), {
    role: "org_owner",
    organizationId: organization._id,
  });

  return organization;
}