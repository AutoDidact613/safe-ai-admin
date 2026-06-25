import { Router } from "express";
import { submitContactForm } from "../controllers/contactController";
import { getMyRequests, getRequestById } from "../controllers/contactMessageController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// GET /contact/my-requests - Get all contact requests of the authenticated user
router.get("/my-requests", authenticateToken, getMyRequests);

// POST /contact - Submit contact form (requires authentication)
router.post("/", authenticateToken, submitContactForm);

router.get("/my-requests/:id", authenticateToken, getRequestById);

export default router;
