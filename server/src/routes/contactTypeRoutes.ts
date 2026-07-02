import { Router } from "express";
import { getContactTypes } from "../controllers/contactTypeController";
import { authenticateToken } from "../middleware/auth";

const router = Router();
router.get("/", authenticateToken, getContactTypes);
export default router;