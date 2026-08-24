import express from "express";
import {
  createUserHandler,
  listUsersHandler,
  getUserHandler,
  updateUserHandler,
  deleteUserHandler,
  updateOwnProfileHandler
} from "../controllers/userController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = express.Router();

router.post("/", requireAdmin, createUserHandler);
router.get("/", requireAdmin, listUsersHandler);
router.get("/:id", requireAdmin, getUserHandler);
router.put("/:id", requireAdmin, updateUserHandler);
router.patch("/:id", authenticateToken, updateOwnProfileHandler); // Protected route for users to update their own profile
router.delete("/:id", requireAdmin, deleteUserHandler);

export default router;
