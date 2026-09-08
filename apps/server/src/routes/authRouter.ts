/**
 * Authentication Routes
 */

import express from "express";
import {
  registerHandler,
  loginHandler,
  refreshTokenHandler,
  logoutHandler,
  verifyEmailHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  changePasswordHandler,
  getCurrentUserHandler,
} from "../controllers/authController";
import {
  googleLoginHandler,
  googleCallbackHandler,
} from "../controllers/googleAuthController";
import { authenticateToken } from "../middleware/auth";
import {
  loginRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
} from "../middleware/authRateLimiter";

const router = express.Router();

// Public routes
router.post("/register", registerRateLimiter, registerHandler);
router.post("/login", loginRateLimiter, loginHandler);
router.post("/refresh", refreshTokenHandler);
router.get("/verify-email/:token", verifyEmailHandler);
router.post("/forgot-password", passwordResetRateLimiter, forgotPasswordHandler);
router.post("/reset-password", passwordResetRateLimiter, resetPasswordHandler);

// Google OAuth routes
router.get("/google", googleLoginHandler);
router.get("/google/callback", googleCallbackHandler);

// Protected routes (require JWT)
router.post("/logout", authenticateToken, logoutHandler);
router.post(
  "/change-password",
  passwordResetRateLimiter,
  authenticateToken,
  changePasswordHandler
);
router.get("/me", authenticateToken, getCurrentUserHandler);

export default router;
