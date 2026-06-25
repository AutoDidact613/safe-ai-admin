import { Router } from "express";
import { submitContactForm } from "../controllers/contactController";
import { getMyRequests, getRequestById, closeRequestById } from "../controllers/contactMessageController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// GET /contact/my-requests - Get all contact requests of the authenticated user
router.get("/my-requests", authenticateToken, getMyRequests);

// POST /contact - Submit contact form (requires authentication)
router.post("/", authenticateToken, submitContactForm);

router.get("/my-requests/:id", authenticateToken, getRequestById);

router.patch("/my-requests/:id/close", authenticateToken, closeRequestById);

export default router;
