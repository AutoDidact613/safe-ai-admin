import express from "express";
import {
  createUserHandler,
  listUsersHandler,
  getUserHandler,
  updateUserHandler,
  deleteUserHandler,
  updateOwnProfileHandler
} from "../controllers/userController";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

router.post("/", createUserHandler);
router.get("/", listUsersHandler);
router.get("/:id", getUserHandler);
router.put("/:id", updateUserHandler);
router.patch("/:id", authenticateToken, updateOwnProfileHandler); // Protected route for users to update their own profile
router.delete("/:id", deleteUserHandler);

export default router;
