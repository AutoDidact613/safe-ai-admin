
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
import { nonnegative } from "zod";

const SALT_ROUNDS = 10;

export async function register(data: {
  email: string;
  password: string;
  name: string;
  organization?: string;
  organizationId?: string;
  profileId?: string;
  mode?: "BYOK" | "MANAGED" | "MANAGED_ORG";
  role?: string;
  skipEmailVerification?: boolean;
  mustChangePassword?: boolean;
}) {
  const existingUser = await User.findOne({ email: data.email.toLowerCase() });
  if (existingUser) {
    throw new Error("משתמש עם אימייל זה כבר קיים במערכת");
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const proxyApiKey = generateApiKey("sk-safeai");
  const proxyKeyHash = hashApiKey(proxyApiKey);
  const proxyKeyPrefix = getKeyPrefix(proxyApiKey);

  const verificationToken = generateRandomToken();
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  try {
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

    const { key, token, key_name } = response.data;
    const litellmKeyEncrypted = encryptSecret(key);

    const user = await User.create({
      email: data.email.toLowerCase(),
      password: hashedPassword,
      name: data.name,
      ...(data.organization && { organization: data.organization }),
      ...(data.organizationId && { organizationId: data.organizationId }),
      ...(data.profileId && { profileId: data.profileId }),
      mode: data.mode || "BYOK",
      role: data.role || "user",
      proxyKeyHash,
      proxyKeyPrefix,
      litellmKeyEncrypted,
      litellmPrefix: key_name,
      litellmToken: token,
      emailVerified: !!data.skipEmailVerification,
      verificationToken,
      verificationTokenExpires,
      mustChangePassword: !!data.mustChangePassword,
    });

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
      proxyApiKey,
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

export async function login(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw {
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "אימייל או סיסמה שגויים",
    };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw {
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "אימייל או סיסמה שגויים",
    };
  }

  if (!user.emailVerified) {
    throw {
      statusCode: 403,
      code: "EMAIL_NOT_VERIFIED",
      message: "נא לאמת את כתובת האימייל שלך לפני ההתחברות",
    };
  }

  if (!user.isActive) {
    throw {
      statusCode: 403,
      code: "USER_NOT_ACTIVE",
      message: "החשבון שלך אינו פעיל. אנא פנה לתמיכה",
    };
  }

  user.lastLogin = new Date();

  const tokens = generateTokenPair({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  if (!user.refreshTokens) {
    user.refreshTokens = [];
  }
  user.refreshTokens.push(tokens.refreshToken);

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

export async function refreshAccessToken(refreshToken: string) {
  try {
    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      throw new Error("Invalid refresh token");
    }

    const tokens = generateTokenPair({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

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

export async function logout(userId: string, refreshToken: string) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.refreshTokens) {
    user.refreshTokens = user.refreshTokens.filter((t: string) => t !== refreshToken);
    await user.save();
  }

  return { success: true };
}

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

export async function forgotPassword(email: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Don't reveal if user exists
    return { success: true };
  }

  const resetToken = generateRandomToken();
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.passwordResetToken = resetToken;
  user.passwordResetExpires = resetExpires;
  await user.save();

  await sendPasswordResetEmail(user.email, resetToken, user.name || undefined);

  return { success: true };
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new Error("קישור איפוס הסיסמה אינו תקף או שפג תוקפו");
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  user.password = hashedPassword;
  user.passwordResetToken = null as any;
  user.passwordResetExpires = null as any;

  user.refreshTokens = [];

  await user.save();

  return { success: true };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw { statusCode: 401, message: "הסיסמה הנוכחית שגויה" };
  }

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.mustChangePassword = false;
  await user.save();

  return { success: true };
}

export async function getCurrentUser(userId: string) {
  const user = await User.findById(userId).populate("profileId");
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}