/**
 * Authentication Service
 * Handles user registration, login, token management, and password reset
 */

import bcrypt from "bcryptjs";
import { User } from "../models/user";
import {
  generateTokenPair,
  generateRandomToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/email";
import {
  encryptSecret,
  generateApiKey,
  getKeyPrefix,
  hashApiKey,
} from "../utils/crypto";
import axios from "axios";
import logger from "../logger";

const SALT_ROUNDS = 10;

/**
 * Register a new user
 */
export async function register(data: {
  email: string;
  password: string;
  name: string;
  organization?: string;
  organizationId?: string;
  profileId?: string;
  mode?: "BYOK" | "MANAGED";
  role?: string;
  skipEmailVerification?: boolean;
}) {
  if (data.email.includes("+")) {
    throw new Error("משתמש עם אימייל זה כבר קיים במערכת");
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: data.email.toLowerCase() });
  if (existingUser) {
    throw new Error("משתמש עם אימייל זה כבר קיים במערכת");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  // Generate proxy API key
  const proxyApiKey = generateApiKey("sk-safeai");
  const proxyKeyHash = hashApiKey(proxyApiKey);
  const proxyKeyPrefix = getKeyPrefix(proxyApiKey);

  // Generate verification token
  const verificationToken = generateRandomToken();
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  let key: string | undefined;
  let token: string | undefined;
  let key_name: string | undefined;
  let litellmKeyEncrypted: string | undefined;

  try {
    // Register with LiteLLM
    const response = await axios.post(
      `${process.env.LITELLM_PROXY_URL}/key/generate`,
      {
        models: ["*"],
        user_id: data.email,
        duration: "30d",
        metadata: {
          source: "SafeAI_Registration",
          user_email: data.email,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.LITELLM_MASTER_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 5000,
      },
    );

    ({ key, token, key_name } = response.data);
    if (key) {
      litellmKeyEncrypted = encryptSecret(key);
    }
  } catch (error: any) {
    logger.warn("LiteLLM registration failed, continuing without proxy key:", {
      error: error.response?.data || error.message,
    });
  }

  try {
    // Create user in database
    const user = await User.create({
      email: data.email.toLowerCase(),
      password: hashedPassword,
      name: data.name,
      ...(data.organization && { organization: data.organization }),
      ...(data.organizationId && { organizationId: data.organizationId }),
      ...(data.profileId && { profileId: data.profileId }),
      mode: data.mode || "BYOK",
      role: data.role || "user", // Always "user" unless caller specifies (e.g. org_owner)
      proxyKeyHash,
      proxyKeyPrefix,
      litellmKeyEncrypted,
      litellmPrefix: key_name,
      litellmToken: token,
      emailVerified: !!data.skipEmailVerification,
      verificationToken,
      verificationTokenExpires,
    });

    // Only send the verification email for the normal self-registration flow.
    // Flows where a different gate exists (e.g. admin approval for org owners)
    // can skip it via skipEmailVerification.
    if (!data.skipEmailVerification) {
      logger.info("Before sending verification email", {
        email: user.email,
      });

      await sendVerificationEmail(
        user.email,
        verificationToken,
        user.name || undefined,
      );

      logger.info("After sending verification email", {
        email: user.email,
      });
    }

    await user.save();

    return {
      user,
      proxyApiKey, // Return this only once!
    };
  } catch (error: any) {
    const errorDetail = error.response?.data || error.message;
    logger.error("Registration failed:", {
      error: errorDetail.message,
      stack: errorDetail.stack,
    });
    throw new Error(
      `ההרשמה נכשלה: ${error.message || "שגיאה בתקשורת עם השרת"}`,
    );
  }
}

/**
 * Login user
 */
export async function login(email: string, password: string) {
  // Find user
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw {
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "אימייל או סיסמה שגויים",
    };
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw {
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "אימייל או סיסמה שגויים",
    };
  }

  // Check if email is verified
  if (!user.emailVerified) {
    throw {
      statusCode: 403,
      code: "EMAIL_NOT_VERIFIED",
      message: "נא לאמת את כתובת האימייל שלך לפני ההתחברות",
    };
  }

  // Check if user is active
  if (!user.isActive) {
    throw {
      statusCode: 403,
      code: "USER_NOT_ACTIVE",
      message: "החשבון שלך אינו פעיל. אנא פנה לתמיכה",
    };
  }

  // Update last login
  user.lastLogin = new Date();

  // Generate JWT tokens
  const tokens = generateTokenPair({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  // Add refresh token to user's tokens
  if (!user.refreshTokens) {
    user.refreshTokens = [];
  }
  user.refreshTokens.push(tokens.refreshToken);

  // Keep only last 5 refresh tokens
  if (user.refreshTokens.length > 5) {
    user.refreshTokens = user.refreshTokens.slice(-5);
  }

  await user.save();

  return {
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string) {
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if refresh token exists in user's tokens
    if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      throw new Error("Invalid refresh token");
    }

    // Generate new access token
    const tokens = generateTokenPair({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Replace old refresh token with new one
    user.refreshTokens = user.refreshTokens.filter((t: string) => t !== refreshToken);
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
}

/**
 * Logout user (invalidate refresh token)
 */
export async function logout(userId: string, refreshToken: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Remove refresh token
  if (user.refreshTokens) {
    user.refreshTokens = user.refreshTokens.filter((t: string) => t !== refreshToken);
    await user.save();
  }

  return { success: true };
}

/**
 * Verify email
 */
export async function verifyEmail(token: string) {
  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new Error("קישור האימות אינו תקף או שפג תוקפו");
  }

  user.emailVerified = true;
  user.verificationToken = null as any;
  user.verificationTokenExpires = null as any;
  await user.save();

  return { user };
}

/**
 * Request password reset
 */
export async function forgotPassword(email: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Don't reveal if user exists
    return { success: true };
  }

  // Generate reset token
  const resetToken = generateRandomToken();
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.passwordResetToken = resetToken;
  user.passwordResetExpires = resetExpires;
  await user.save();

  // Send reset email
  await sendPasswordResetEmail(user.email, resetToken, user.name || undefined);

  return { success: true };
}

/**
 * Reset password
 */
export async function resetPassword(token: string, newPassword: string) {
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new Error("קישור איפוס הסיסמה אינו תקף או שפג תוקפו");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  user.password = hashedPassword;
  user.passwordResetToken = null as any;
  user.passwordResetExpires = null as any;

  // Invalidate all refresh tokens for security
  user.refreshTokens = [];

  await user.save();

  return { success: true };
}

/**
 * Get current user info
 */
export async function getCurrentUser(userId: string) {
  const user = await User.findById(userId).populate("profileId");
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}