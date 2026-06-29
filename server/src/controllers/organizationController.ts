import { Request, Response } from "express";
import {
  createOrganization,
  listOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
  getOrganizationUsers,
  addUserToOrganization,
  removeUserFromOrganization,
  addUserToOrganizationByEmail,
  topUpOrganizationWallet,
  getPendingOrganizationsForAdmin
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
  } catch (error) {
    logger.error("Failed to create organization", { error });
    res.status(500).json({ error: "Failed to create organization" });
  }
}

/**
 * List organizations (Admin sees all, Org Owner sees theirs)
 */
export async function listOrganizationsHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;

    // הגנה בסיסית: אם אין משתמש מחובר בכלל בטוקן
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: No user token provided" });
    }

    // שליפת כל הארגונים מהשירות
    const allOrganizations = await listOrganizations();

    // 1. אם מדובר באדמין של המערכת - מחזירים לו את כל הארגונים
    if (user.role === "admin") {
      return res.status(200).json(allOrganizations);
    }

    // 2. חילוץ ה-ID של המשתמש הנוכחי מהטוקן
    const currentUserId = user.userId || user.id || user._id;

    // 3. סינון גמיש לבעל הארגון
    const userOrganizations = allOrganizations.filter((org: any) => {
      if (!org.ownerId) return false;
      const orgOwnerId = org.ownerId._id ? org.ownerId._id.toString() : org.ownerId.toString();
      return orgOwnerId === currentUserId;
    });

    return res.status(200).json(userOrganizations);
  } catch (error: any) {
    logger.error("Failed to list organizations", { error });
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

    // Check permissions (Admin or Organization Owner)
    if (
      user.role !== "admin" &&
      organization.ownerId.toString() !== user.userId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(organization);
  } catch (error) {
    logger.error("Failed to get organization", { error });
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

    // Check permissions (Admin or Organization Owner)
    if (
      user.role !== "admin" &&
      organization.ownerId.toString() !== user.userId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updatedOrg = await updateOrganization(orgId, req.body);
    res.json({ success: true, organization: updatedOrg });
  } catch (error) {
    logger.error("Failed to update organization", { error });
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
  } catch (error) {
    logger.error("Failed to delete organization", { error });
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
  } catch (error) {
    logger.error("Failed to get organization users", { error });
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

    // Check permissions
    if (
      user.role !== "admin" &&
      organization.ownerId.toString() !== user.userId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    await addUserToOrganization(orgId, userId, role || "org_user");
    res.json({ success: true, message: "User added to organization" });
  } catch (error: any) {
    logger.error("Failed to add user to organization", { error });
    res.status(400).json({ error: error.message || "Failed to add user" });
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

    // Check permissions
    if (
      user.role !== "admin" &&
      organization.ownerId.toString() !== user.userId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updatedOrg = await addUserToOrganizationByEmail(
      orgId,
      email,
      role || "org_user"
    );
    res.json({
      success: true,
      message: "User added to organization successfully",
      organization: updatedOrg,
    });
  } catch (error: any) {
    logger.error("Failed to add user by email to organization", { error });
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

    // missing checking logic if user belongs to an organization where the requester is owner.
    // For now, simplify or allow admin/owner through service validation.
    await removeUserFromOrganization(targetUserId);
    res.json({
      success: true,
      message: "User removed from organization successfully",
    });
  } catch (error: any) {
    logger.error("Failed to remove user from organization", { error });
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

    if (
      user.role !== "admin" &&
      organization.ownerId.toString() !== user.userId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updatedOrg = await topUpOrganizationWallet(orgId, amount);
    res.json({
      success: true,
      message: "Wallet topped up successfully",
      organization: updatedOrg,
    });
  } catch (error: any) {
    logger.error("Failed to top up organization wallet", { error });
    res.status(500).json({ error: "Failed to top up wallet", details: error.message });
  }
}