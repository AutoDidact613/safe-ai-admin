/**
 * Google OAuth Controller
 * Handles Google OAuth authentication flow
 */

import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import * as userService from "../services/userService";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import logger from "../logger";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/auth/google/callback";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

/**
 * Initiate Google OAuth flow
 * GET /api/auth/google
 */
export async function googleLoginHandler(req: Request, res: Response) {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      prompt: "consent",
    });

    res.redirect(authUrl);
  } catch (error: any) {
    logger.error("Google login initiation error:", { error: error.message, stack: error.stack });
    res.redirect(`${CLIENT_URL}/login?error=google_auth_failed`);
  }
}

/**
 * Handle Google OAuth callback
 * GET /api/auth/google/callback
 */
export async function googleCallbackHandler(req: Request, res: Response) {
  try {
    const { code } = req.query;

    if (!code || typeof code !== "string") {
      return res.redirect(`${CLIENT_URL}/login?error=no_code`);
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info from Google
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.redirect(`${CLIENT_URL}/login?error=no_email`);
    }

    const { email } = payload;

    // Check if user exists
    const user = await userService.findUserByEmail(email);

    if (!user) {
      // User doesn't exist - redirect to registration page
      return res.redirect(`${CLIENT_URL}/login?error=user_not_found`);
    }

    // Existing user - log them in
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Store refresh token
    await userService.addRefreshToken(user._id.toString(), refreshToken);

    // Redirect to dashboard with tokens
    res.redirect(
      `${CLIENT_URL}/login?` +
      `accessToken=${encodeURIComponent(accessToken)}&` +
      `refreshToken=${encodeURIComponent(refreshToken)}&` +
      `googleAuth=true`
    );
  } catch (error: any) {
    logger.error("Google callback error:", { error: error.message, stack: error.stack });
    res.redirect(`${CLIENT_URL}/login?error=google_auth_failed`);
  }
}
