import express from "express";
import {
  getMyProfileHandler,
  createProfileHandler,
  updateProfileHandler,
  addResumeFileHandler,
  removeResumeFileHandler,
} from "../controllers/professionalProfileController";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// All routes require authentication - a professional profile always belongs to the caller
router.use(authenticateToken);

router.get("/me", getMyProfileHandler);
router.post("/", createProfileHandler);
router.put("/", updateProfileHandler);
router.post("/resume", addResumeFileHandler);
router.delete("/resume/:fileKey", removeResumeFileHandler);

export default router;
