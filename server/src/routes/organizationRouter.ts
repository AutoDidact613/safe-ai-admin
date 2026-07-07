import express from "express";
import {
  createOrganizationHandler,
  listOrganizationsHandler,
  getOrganizationHandler,
  updateOrganizationHandler,
  deleteOrganizationHandler,
  getOrganizationUsersHandler,
  addUserToOrganizationHandler,
  createOrganizationMemberHandler,
  removeUserFromOrganizationHandler,
  addUserByEmailToOrganizationHandler,
  topUpOrganizationWalletHandler,
  getPendingOrganizationsHandler,
  getAllOrganizationsHandler,
  suspendOrganizationHandler,
  activateOrganizationHandler,
  getOrganizationStatsHandler,
  publicRequestOrganizationHandler,
  approveOrganizationHandler,
  rejectOrganizationHandler,
  getMyOrganizationHandler,
  addOrganizationProviderKeyHandler,
  listOrganizationProviderKeysHandler,
  deleteOrganizationProviderKeyHandler,
} from "../controllers/organizationController";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { getOrganizationById } from "../services/organizationService";

const router = express.Router();

export async function requireApprovedOrg(
  req: express.Request<{ id: string }>,
  res: express.Response,
  next: express.NextFunction
) {
  const user = (req as any).user;
  if (user?.role === "admin") return next();
  try {
    const org = await getOrganizationById(req.params.id);
    if (!org) return res.status(404).json({ error: "Organization not found" });
    if ((org as any).status !== "approved") {
      return res.status(403).json({ error: "Organization is not approved yet" });
    }
    return next();
  } catch {
    return res.status(500).json({ error: "Failed to verify organization status" });
  }
}

// ===== PUBLIC — no auth required (org owner sign-up) =====
// חייב להיות לפני router.use(authenticateToken) למטה!
router.post("/public-request", publicRequestOrganizationHandler);

// 🔒 מכאן ואילך כל הנתיבים דורשים אימות משתמש מחובר (Token)
router.use(authenticateToken);

// 1. PROTECTED STATIC ROUTES (נתיבים סטטיים תמיד ראשונים)
router.get("/pending", requireAdmin, getPendingOrganizationsHandler); // System Admin only
router.get("/admin/all", requireAdmin, getAllOrganizationsHandler); // System Admin only - full list with stats
router.get("/my", getMyOrganizationHandler); // Current user's own organization (any status)

// 2. GENERAL ORGANIZATION ROUTES
router.post("/", createOrganizationHandler); // Admin only
router.get("/", listOrganizationsHandler);    // Admin רואה הכל, Org Owner רואה את שלו

// 3. PROTECTED DYNAMIC ROUTES (נתיבים עם מזהה דינמי תמיד בסוף)
router.get("/:id", getOrganizationHandler);    // Admin or Org Owner
router.put("/:id", requireApprovedOrg, updateOrganizationHandler);   // Admin or approved Org Owner
router.patch("/:id", requireApprovedOrg, updateOrganizationHandler); // Admin or approved Org Owner
router.delete("/:id", deleteOrganizationHandler); // Admin only

// Suspend / Reactivate an organization (Admin only)
router.patch("/:id/suspend", requireAdmin, suspendOrganizationHandler);   // Admin only -> isActive: false
router.patch("/:id/activate", requireAdmin, activateOrganizationHandler); // Admin only -> isActive: true

// Approve / Reject a pending organization request (Admin only)
router.patch("/:id/approve", requireAdmin, approveOrganizationHandler); // Admin only -> approved + isActive
router.patch("/:id/reject", requireAdmin, rejectOrganizationHandler);   // Admin only -> rejected

// Organization usage summary + wallet balance
router.get("/:id/stats", getOrganizationStatsHandler);      // Admin or Org Owner

// Management of Users inside Organization (blocked until org is approved, admins bypass)
router.get("/:id/users", requireApprovedOrg, getOrganizationUsersHandler); // Admin or approved Org Owner
router.post("/:id/users", requireApprovedOrg, addUserToOrganizationHandler); // Admin or approved Org Owner
router.post("/:id/members", requireApprovedOrg, createOrganizationMemberHandler); // Admin or approved Org Owner - creates a brand-new user + temp password
router.delete("/users/:userId", removeUserFromOrganizationHandler); // Admin or Org Owner
router.post("/:id/users/by-email", requireApprovedOrg, addUserByEmailToOrganizationHandler); // Admin or approved Org Owner

// Wallet Management (Mock) - blocked until org is approved (admins bypass)
router.post("/:id/top-up", requireApprovedOrg, topUpOrganizationWalletHandler); // Admin or approved Org Owner

// Org-level AI provider keys, used by "MANAGED_ORG" members instead of a personal key
router.post("/:id/provider-keys", requireApprovedOrg, addOrganizationProviderKeyHandler); // Admin or approved Org Owner
router.get("/:id/provider-keys", requireApprovedOrg, listOrganizationProviderKeysHandler); // Admin or approved Org Owner
router.delete("/:id/provider-keys/:keyId", requireApprovedOrg, deleteOrganizationProviderKeyHandler); // Admin or approved Org Owner

export default router;