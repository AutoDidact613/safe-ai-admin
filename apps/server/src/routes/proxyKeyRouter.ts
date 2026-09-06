import express from "express";
import {
  getProxyKeyHandler,
  regenerateProxyKeyHandler,
  toggleProxyKeyHandler,
} from "../controllers/proxyKeyController";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get current user's proxy key info
router.get("/", getProxyKeyHandler);

// Regenerate proxy key
router.post("/regenerate", regenerateProxyKeyHandler);

// Toggle proxy key status (enable/disable)
router.patch("/toggle", toggleProxyKeyHandler);

export default router;
