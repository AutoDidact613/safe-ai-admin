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
 * List all organizations (Admin only)
 */
export async function listOrganizationsHandler(req: Request, res: Response) {
  try {
    const adminUser = (req as any).user;

    if (adminUser.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const organizations = await listOrganizations();
    res.json(organizations);
  } catch (error) {
    logger.error("Failed to list organizations", { error });
    res.status(500).json({ error: "Failed to fetch organizations" });
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

    // Check permissions: admin or owner of this organization
    if (
      user.role !== "admin" &&
      organization.ownerId.toString() !== user.userId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(organization);
  } catch (error) {
    logger.error("Failed to get organization", { error });
    res.status(500).json({ error: "Failed to fetch organization" });
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

    // Check permissions
    if (
      user.role !== "admin" &&
      organization.ownerId.toString() !== user.userId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await updateOrganization(orgId, req.body);
    res.json({ success: true, organization: updated });
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
    res.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete organization", { error });
    res.status(500).json({ error: "Failed to delete organization" });
  }
}

/**
 * Get all users in an organization (Admin or Org Owner)
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

    // Check permissions: admin or owner of this organization
    if (
      user.role !== "admin" &&
      organization.ownerId.toString() !== user.userId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const users = await getOrganizationUsers(orgId);
    res.json(users);
  } catch (error) {
    logger.error("Failed to get organization users", { error });
    res.status(500).json({ error: "Failed to fetch organization users" });
  }
}

/**
 * Add user to organization (Admin or Org Owner)
 */
export async function addUserToOrganizationHandler(
  req: Request<{ id: string }>,
  res: Response
) {
  try {
    const user = (req as any).user;
    const orgId = req.params.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
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

    const updatedUser = await addUserToOrganization(orgId, userId);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    logger.error("Failed to add user to organization", { error });
    res.status(500).json({ error: "Failed to add user to organization" });
  }
}

/**
 * Remove user from organization (Admin or Org Owner)
 */
export async function removeUserFromOrganizationHandler(
  req: Request<{ userId: string }>,
  res: Response
) {
  try {
    const user = (req as any).user;
    const { userId } = req.params;

    // Get the user to check their organization
    const targetUser = await getOrganizationUsers(user.organizationId);
    
    // Check permissions: admin or owner of the user's organization
    if (user.role !== "admin" && user.role !== "org_owner") {
      return res.status(403).json({ error: "Access denied" });
    }

    const updatedUser = await removeUserFromOrganization(userId);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    logger.error("Failed to remove user from organization", { error });
    res.status(500).json({ error: "Failed to remove user from organization" });
  }
}

export async function getPendingOrganizations(req: Request, res: Response): Promise<void> {
  try{
    const pendingOrganizations = await getPendingOrganizationsForAdmin();

    res.status(200).json({
      success: true,
      data: pendingOrganizations,
    });
  }
  catch (error: any) {
    res.status(500).json({
      success: false,
      message: "שגיאה בשרת בעת שליפת ארגונים ממתינים",
      error: error.message,
    });
  }
}
