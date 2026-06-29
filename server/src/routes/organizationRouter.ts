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
  addUserByEmailToOrganizationHandler,
  topUpOrganizationWalletHandler,
  getPendingOrganizationsHandler,
} from "../controllers/organizationController";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// 🔒 כל הנתיבים של הארגונים דורשים אימות משתמש מחובר (Token)
router.use(authenticateToken);

// 1. PROTECTED STATIC ROUTES (נתיבים סטטיים תמיד ראשונים)
router.get("/pending", getPendingOrganizationsHandler); // System Admin only
router.patch("/pending/:id", updateOrganizationHandler); // מעדכן את הסטטוס של הארגון הממתין מול ה-DB

// 2. GENERAL ORGANIZATION ROUTES
router.post("/", createOrganizationHandler); // Admin only
router.get("/", listOrganizationsHandler);    // Admin רואה הכל, Org Owner רואה את שלו

// 3. PROTECTED DYNAMIC ROUTES (נתיבים עם מזהה דינמי תמיד בסוף)
router.get("/:id", getOrganizationHandler);    // Admin or Org Owner
router.put("/:id", updateOrganizationHandler);   // Admin or Org Owner
router.patch("/:id", updateOrganizationHandler); // Admin or Org Owner
router.delete("/:id", deleteOrganizationHandler); // Admin only

// Management of Users inside Organization
router.get("/:id/users", getOrganizationUsersHandler); // Admin or Org Owner
router.post("/:id/users", addUserToOrganizationHandler); // Admin or Org Owner
router.delete("/users/:userId", removeUserFromOrganizationHandler); // Admin or Org Owner
router.post("/:id/users/by-email", addUserByEmailToOrganizationHandler); // Admin or Org Owner

// Wallet Management (Mock)
router.post("/:id/top-up", topUpOrganizationWalletHandler); // Admin or Org Owner

export default router;