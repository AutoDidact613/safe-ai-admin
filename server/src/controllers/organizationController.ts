import { Request, Response } from "express";
import {
  createOrganization,
  listOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  getOrganizationUsers,
  addUserToOrganization,
  createOrganizationMember,
  removeUserFromOrganization,
  addUserToOrganizationByEmail,
  getOrganizationForUser,
  topUpOrganizationWallet,
  getPendingOrganizationsForAdmin,
  listAllOrganizationsWithStats,
  setOrganizationActive,
  getOrganizationUsageSummary,
  publicRequestOrganization,
  approveOrganization,
  rejectOrganization,
  getMyOrganization,
} from "../services/organizationService";
import logger from "../logger";

/**
 * Create a new organization (Admin only)
 */
export async function createOrganizationHandler(req: Request, res: Response) {
  try {
    const adminUser = (req as any).user;
    if (adminUser.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    const organization = await createOrganization(req.body);
    res.status(201).json({ success: true, organization });
  } catch (error: any) {
    logger.error("Failed to create organization", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
    });
    res.status(500).json({ error: "Failed to create organization" });
  }
}

/**
 * List organizations (Admin sees all, Org Owner sees theirs)
 */
export async function listOrganizationsHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized: No user token provided" });
    }

    const allOrganizations = await listOrganizations();

    if (user.role === "admin") {
      return res.status(200).json(allOrganizations);
    }

    const currentUserId = user.userId || user.id || user._id;

    const userOrganizations = allOrganizations.filter((org: any) => {
      if (!org.ownerId) return false;
      const orgOwnerId = org.ownerId._id ? org.ownerId._id.toString() : org.ownerId.toString();
      return orgOwnerId === currentUserId;
    });

    return res.status(200).json(userOrganizations);
  } catch (error: any) {
    logger.error("Failed to list organizations", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
    });
    return res.status(500).json({ error: "Failed to fetch organizations", details: error.message });
  }
}

/**
 * Get organization by ID (Admin or Org Owner)
 */
export async function getOrganizationHandler(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const user = (req as any).user;
    const orgId = req.params.id;

    const organization = await getOrganizationById(orgId);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const ownerId = (organization.ownerId as any)?._id ?? organization.ownerId;

    if (user.role !== "admin" && ownerId.toString() !== user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(organization);
  } catch (error: any) {
    logger.error("Failed to get organization", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: req.params.id,
    });
    res.status(500).json({ error: "Failed to get organization" });
  }
}

/**
 * Update organization (Admin or Org Owner)
 */
export async function updateOrganizationHandler(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const user = (req as any).user;
    const orgId = req.params.id;

    const organization = await getOrganizationById(orgId);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const ownerId = (organization.ownerId as any)?._id ?? organization.ownerId;
    const isAdmin = user.role === "admin";

    if (!isAdmin && ownerId.toString() !== user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Non-admin owners may only edit their own profile fields - not status,
    // walletBalance, isActive, ownerId, etc. Those go through their own
    // dedicated admin-only routes (approve/reject/suspend/activate/top-up).
    const updateData = isAdmin
      ? req.body
      : { name: req.body.name, description: req.body.description };

    const updatedOrg = await updateOrganization(orgId, updateData);
    res.json({ success: true, organization: updatedOrg });
  } catch (error: any) {
    logger.error("Failed to update organization", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: req.params.id,
    });
    res.status(500).json({ error: "Failed to update organization" });
  }
}

/**
 * Delete organization (Admin only)
 */
export async function deleteOrganizationHandler(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const adminUser = (req as any).user;
    if (adminUser.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    await deleteOrganization(req.params.id);
    res.json({ success: true, message: "Organization deleted successfully" });
  } catch (error: any) {
    logger.error("Failed to delete organization", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: req.params.id,
    });
    res.status(500).json({ error: "Failed to delete organization" });
  }
}

/**
 * Get users of an organization (Admin or Org Owner)
 */
export async function getOrganizationUsersHandler(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const user = (req as any).user;
    const orgId = req.params.id;

    const organization = await getOrganizationById(orgId);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const orgOwnerId = organization.ownerId?._id
        ? organization.ownerId._id.toString()
        : organization.ownerId.toString();

    if (user.role !== "admin" && orgOwnerId !== user.userId) {
      return res.status(403).json({ error: "Access denied - You are not the owner" });
    }

    const users = await getOrganizationUsers(orgId);
    res.json(users);
  } catch (error: any) {
    logger.error("Failed to get organization users", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: req.params.id,
    });
    res.status(500).json({ error: "Failed to get organization users" });
  }
}

/**
 * Add an existing user to an organization by ID (Admin or Org Owner)
 */
export async function addUserToOrganizationHandler(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const user = (req as any).user;
    const orgId = req.params.id;
    const { userId, role } = req.body;

    const organization = await getOrganizationById(orgId);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const ownerId = (organization.ownerId as any)?._id ?? organization.ownerId;

    if (user.role !== "admin" && ownerId.toString() !== user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await addUserToOrganization(orgId, userId, role || "user");
    res.json({ success: true, message: "User added to organization" });
  } catch (error: any) {
    logger.error("Failed to add user to organization", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: req.params.id,
    });
    res.status(400).json({ error: error.message || "Failed to add user" });
  }
}

/**
 * Create a brand-new user account directly inside an organization,
 * with a generated temporary password (Admin or Org Owner)
 */
export async function createOrganizationMemberHandler(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const user = (req as any).user;
    const orgId = req.params.id;
    const { name, email, role } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: "יש למלא שם וכתובת אימייל" });
    }

    const organization = await getOrganizationById(orgId);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const ownerId = (organization.ownerId as any)?._id ?? organization.ownerId;

    if (user.role !== "admin" && ownerId.toString() !== user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { user: newUser, temporaryPassword } = await createOrganizationMember(orgId, {
      name: name.trim(),
      email: email.trim(),
      role,
    });

    res.status(201).json({
      success: true,
      user: { _id: newUser._id, name: newUser.name, email: newUser.email },
      temporaryPassword,
    });
  } catch (error: any) {
    logger.error("Failed to create organization member", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: req.params.id,
    });
    res.status(400).json({ error: error.message || "Failed to create organization member" });
  }
}

/**
 * Add a user to organization by Email (Admin or Org Owner)
 */
export async function addUserByEmailToOrganizationHandler(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const user = (req as any).user;
    const orgId = req.params.id;
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const organization = await getOrganizationById(orgId);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const ownerId = (organization.ownerId as any)?._id ?? organization.ownerId;

    if (user.role !== "admin" && ownerId.toString() !== user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updatedOrg = await addUserToOrganizationByEmail(
      orgId,
      email,
      role || "user"
    );
    res.json({
      success: true,
      message: "User added to organization successfully",
      organization: updatedOrg,
    });
  } catch (error: any) {
    logger.error("Failed to add user by email to organization", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: req.params.id,
    });
    res
      .status(400)
      .json({ error: error.message || "Failed to add user by email" });
  }
}

/**
 * Remove a user from an organization (Admin or Org Owner)
 */
export async function removeUserFromOrganizationHandler(
  req: Request<{ userId: string }>,
  res: Response
) {
  try {
    const user = (req as any).user;
    const targetUserId = req.params.userId;

    const targetOrg = await getOrganizationForUser(targetUserId);
    if (!targetOrg) {
      return res.status(404).json({ error: "User not found or not in an organization" });
    }

    const ownerId = (targetOrg.ownerId as any)?._id ?? targetOrg.ownerId;

    if (user.role !== "admin" && ownerId.toString() !== user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await removeUserFromOrganization(targetUserId);
    res.json({
      success: true,
      message: "User removed from organization successfully",
    });
  } catch (error: any) {
    logger.error("Failed to remove user from organization", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      targetUserId: req.params.userId,
    });
    res.status(400).json({ error: error.message || "Failed to remove user" });
  }
}

/**
 * Get all pending organizations for authorization (Admin only)
 */
export async function getPendingOrganizationsHandler(
  req: Request,
  res: Response
) {
  try {
    const pendingOrganizations = await getPendingOrganizationsForAdmin();

    res.status(200).json({
      success: true,
      data: pendingOrganizations,
    });
  } catch (error: any) {
    logger.error("Failed to get pending organizations", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
    });
    res.status(500).json({
      success: false,
      message: "שגיאה בשרת בעת שליפת ארגונים ממתינים",
      error: error.message,
    });
  }
}

/**
 * Top up organization wallet (Admin or Org Owner) - Mock Only
 */
export async function topUpOrganizationWalletHandler(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const user = (req as any).user;
    const orgId = req.params.id;
    const { amount } = req.body;

    if (amount === undefined || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "A valid positive amount is required" });
    }

    const organization = await getOrganizationById(orgId);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const ownerId = (organization.ownerId as any)?._id ?? organization.ownerId;

    if (user.role !== "admin" && ownerId.toString() !== user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updatedOrg = await topUpOrganizationWallet(orgId, amount);
    res.json({
      success: true,
      message: "Wallet topped up successfully",
      organization: updatedOrg,
    });
  } catch (error: any) {
    logger.error("Failed to top up organization wallet", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: req.params.id,
    });
    res.status(500).json({ error: "Failed to top up wallet", details: error.message });
  }
}

/**
 * List ALL organizations with user counts + wallet balance (Admin only)
 */
export async function getAllOrganizationsHandler(req: Request, res: Response) {
  try {
    const organizations = await listAllOrganizationsWithStats();
    res.status(200).json(organizations);
  } catch (error: any) {
    logger.error("Failed to list all organizations", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
    });
    res.status(500).json({ error: "Failed to fetch organizations" });
  }
}

/**
 * Suspend an organization (Admin only) -> isActive: false
 */
export async function suspendOrganizationHandler(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const updated = await setOrganizationActive(req.params.id, false);
    res.json({ success: true, message: "Organization suspended", organization: updated });
  } catch (error: any) {
    logger.error("Failed to suspend organization", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: req.params.id,
    });
    res.status(400).json({ error: error.message || "Failed to suspend organization" });
  }
}

/**
 * Reactivate a suspended organization (Admin only) -> isActive: true
 */
export async function activateOrganizationHandler(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const updated = await setOrganizationActive(req.params.id, true);
    res.json({ success: true, message: "Organization reactivated", organization: updated });
  } catch (error: any) {
    logger.error("Failed to reactivate organization", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: req.params.id,
    });
    res.status(400).json({ error: error.message || "Failed to reactivate organization" });
  }
}

/**
 * Get organization usage summary + wallet balance (Admin or Org Owner)
 */
export async function getOrganizationStatsHandler(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const user = (req as any).user;
    const orgId = req.params.id;

    const organization = await getOrganizationById(orgId);
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const orgOwnerId = organization.ownerId?._id
      ? organization.ownerId._id.toString()
      : organization.ownerId.toString();

    if (user.role !== "admin" && orgOwnerId !== user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const summary = await getOrganizationUsageSummary(orgId);
    res.json({ ...summary, walletBalance: (organization as any).walletBalance || 0 });
  } catch (error: any) {
    logger.error("Failed to get organization stats", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: req.params.id,
    });
    res.status(500).json({ error: "Failed to fetch organization stats" });
  }
}

/**
 * PUBLIC: create org-owner account + pending organization together.
 * No authentication required — this IS the sign-up for org owners.
 */
export async function publicRequestOrganizationHandler(req: Request, res: Response) {
  try {
    const { ownerName, ownerEmail, ownerPassword, orgName, orgDescription } = req.body;

    if (!ownerName?.trim() || !ownerEmail?.trim() || !ownerPassword || !orgName?.trim()) {
      return res.status(400).json({ error: "יש למלא שם, אימייל, סיסמה ושם ארגון" });
    }
    if (ownerPassword.length < 6) {
      return res.status(400).json({ error: "הסיסמה חייבת להכיל לפחות 6 תווים" });
    }

    const organization = await publicRequestOrganization({
      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail.trim(),
      ownerPassword,
      orgName: orgName.trim(),
      orgDescription: orgDescription?.trim(),
    });

    res.status(201).json({
      success: true,
      message: "הבקשה נשלחה וממתינה לאישור מנהל המערכת",
      organization,
    });
  } catch (error: any) {
    logger.error("Failed public organization request", {
      error: error.message,
      stack: error.stack,
    });
    // register() ו-publicRequestOrganization() כבר זורקים הודעות עבריות ברורות
    // ומובחנות עבור התנגשות אימייל לעומת התנגשות שם ארגון - מציגים אותן כמו
    // שהן במקום למפות כל שגיאה גורפת ל"אימייל כבר רשום".
    if (error?.message?.includes("אימייל") || error?.message?.includes("שם הארגון")) {
      return res.status(409).json({ error: error.message });
    }
    res.status(400).json({ error: error.message || "שליחת הבקשה נכשלה" });
  }
}

/**
 * Get the current user's own organization (with status). Accessible to the owner
 * regardless of approval state, so the frontend can show the right screen.
 */
export async function getMyOrganizationHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const organization = await getMyOrganization(user.userId);
    res.json({ organization: organization || null });
  } catch (error: any) {
    logger.error("Failed to get user's organization", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
    });
    res.status(500).json({ error: "Failed to fetch organization" });
  }
}

/**
 * Approve a pending organization (Admin only) -> status=approved, isActive=true, email owner
 */
export async function approveOrganizationHandler(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const updated = await approveOrganization(req.params.id);
    res.json({ success: true, message: "Organization approved", organization: updated });
  } catch (error: any) {
    logger.error("Failed to approve organization", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: req.params.id,
    });
    res.status(400).json({ error: error.message || "Failed to approve organization" });
  }
}

/**
 * Reject a pending organization (Admin only) -> status=rejected, isActive=false
 */
export async function rejectOrganizationHandler(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const updated = await rejectOrganization(req.params.id);
    res.json({ success: true, message: "Organization rejected", organization: updated });
  } catch (error: any) {
    logger.error("Failed to reject organization", {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: req.params.id,
    });
    res.status(400).json({ error: error.message || "Failed to reject organization" });
  }
}