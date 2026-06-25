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
} from "../controllers/organizationController";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();


router.get("/", listOrganizationsHandler); // Public

// All routes require authentication
router.use(authenticateToken);

// Organization CRUD
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
router.post("/:id/users/by-email", addUserByEmailToOrganizationHandler); // Admin or Org Owner

export default router;
