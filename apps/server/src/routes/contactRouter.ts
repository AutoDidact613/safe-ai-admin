import { Router } from "express";
import { submitContactForm, registerAttachment } from "../controllers/contactController";
import {
  getMyRequests,
  getRequestById,
  closeRequestById,
  addReply,
  getAllRequests,
  deleteRequestById,
} from "../controllers/contactMessageController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

// GET /contact/my-requests - Get all contact requests of the authenticated user
router.get("/my-requests", authenticateToken, getMyRequests);

// POST /contact - Submit contact form (requires authentication)
router.post("/", authenticateToken, submitContactForm);

// POST /contact/attachments - Register a screenshot/recording just uploaded
// to S3 as "pending", before it's necessarily attached to a submitted request
router.post("/attachments", authenticateToken, registerAttachment);

router.get("/all", authenticateToken, requireAdmin, getAllRequests);

router.get("/my-requests/:id", authenticateToken, getRequestById);

router.patch("/my-requests/:id/close", authenticateToken, closeRequestById);

router.post("/my-requests/:id/reply", authenticateToken, addReply);

router.delete("/:id", authenticateToken, requireAdmin, deleteRequestById);

export default router;
