/**
 * Validation schemas using Zod
 */

import { z } from "zod";

/**
 * Registration validation schema
 */
export const registerSchema = z.object({
  email: z
    .string()
    .email("EMAIL_INVALID")
    .refine((email) => !email.includes("+"), {
      message: 'לא ניתן להשתמש בתו "+" בכתובת המייל',
    }),
  password: z
    .string()
    .min(8, "PASSWORD_TOO_SHORT")
    .regex(/[A-Z]/, "PASSWORD_MISSING_UPPERCASE")
    .regex(/[a-z]/, "PASSWORD_MISSING_LOWERCASE")
    .regex(/[0-9]/, "PASSWORD_MISSING_DIGIT"),
  name: z.string().min(2, "NAME_TOO_SHORT"),
  organization: z.string().optional(),
  organizationId: z.string().min(1, "ORGANIZATION_REQUIRED"),
  profileId: z.string().optional(),
  mode: z.enum(["BYOK", "MANAGED"]).default("BYOK"),
});

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  email: z.string().email("EMAIL_INVALID"),
  password: z.string().min(1, "PASSWORD_REQUIRED"),
});

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

/**
 * Forgot password validation schema
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
});

/**
 * Reset password validation schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z
    .string()
    .min(8, "הסיסמה חייבת להכיל לפחות 8 תווים")
    .regex(/[A-Z]/, "הסיסמה חייבת להכיל לפחות אות גדולה אחת")
    .regex(/[a-z]/, "הסיסמה חייבת להכיל לפחות אות קטנה אחת")
    .regex(/[0-9]/, "הסיסמה חייבת להכיל לפחות ספרה אחת"),
});

/**
 * Verify email validation schema
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

/**
 * Update user validation schema
 */
export const updateUserSchema = z.object({
  name: z.string().min(2, "השם חייב להכיל לפחות 2 תווים").optional(),
  organization: z.string().optional(),
  profileId: z.string().optional(),
  mode: z.enum(["BYOK", "MANAGED"]).optional(),
  role: z.enum(["admin", "user", "org_owner"]).optional(), // Admins can change user roles, including org_owner
  isActive: z.boolean().optional(), // Only admins can change this
});

/**
 * Helper function to validate request body
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((err: z.ZodIssue) => err.message);
      const validationError = new Error(messages.join(", ")) as Error & {
        code?: string;
      };
      validationError.code = messages[0] ?? "VALIDATION_ERROR";
      throw validationError;
    }
    throw error;
  }
}
