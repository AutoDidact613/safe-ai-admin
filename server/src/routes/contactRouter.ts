import { Router } from "express";
import { submitContactForm } from "../controllers/contactController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// POST /contact - Submit contact form (requires authentication)
router.post("/", authenticateToken, submitContactForm);

export default router;
