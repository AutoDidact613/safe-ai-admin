import express from "express";
import {
  createOrganizationHandler,
  listOrganizationsHandler,
  getOrganizationHandler,
  updateOrganizationHandler,
  deleteOrganizationHandler,
  getOrganizationUsersHandler,
  addUserToOrganizationHandler,
  removeUserFromOrganizationHandler,
  topUpOrganizationWalletHandler,
  getPendingOrganizationsHandler,
} from "../controllers/organizationController";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// 1. PUBLIC ROUTES (Must be at the very top, before auth)
router.get("/", listOrganizationsHandler); // Public

// All routes below require authentication
router.use(authenticateToken);

// 2. PROTECTED STATIC ROUTES (Must be before dynamic :id routes)
router.get("/pending", getPendingOrganizationsHandler); // System Admin only
router.patch("/pending/:id", updateOrganizationHandler); // מעדכן את הסטטוס של הארגון הממתין מול ה-DB

// 3. PROTECTED DYNAMIC ROUTES
router.post("/", createOrganizationHandler); // Admin only
router.get("/", listOrganizationsHandler); // Admin only
router.get("/:id", getOrganizationHandler); // Admin or Org Owner
router.put("/:id", updateOrganizationHandler); // Admin or Org Owner
router.patch("/:id", updateOrganizationHandler); // Admin or Org Owner
router.delete("/:id", deleteOrganizationHandler); // Admin only

// Organization Users Management
router.get("/:id/users", getOrganizationUsersHandler); // Admin or Org Owner
router.post("/:id/users", addUserToOrganizationHandler); // Admin or Org Owner
router.delete("/users/:userId", removeUserFromOrganizationHandler); // Admin or Org Owner

// Wallet Management (Mock)
router.post("/:id/top-up", topUpOrganizationWalletHandler); // Admin or Org Owner

export default router;