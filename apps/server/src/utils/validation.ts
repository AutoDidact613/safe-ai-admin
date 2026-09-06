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
    .email("כתובת אימייל לא תקינה")
    .refine((email) => !email.includes("+"), {
      message: 'לא ניתן להשתמש בתו "+" בכתובת המייל',
    }),
  password: z
    .string()
    .min(8, "הסיסמה חייבת להכיל לפחות 8 תווים")
    .regex(/[A-Z]/, "הסיסמה חייבת להכיל לפחות אות גדולה אחת")
    .regex(/[a-z]/, "הסיסמה חייבת להכיל לפחות אות קטנה אחת")
    .regex(/[0-9]/, "הסיסמה חייבת להכיל לפחות ספרה אחת"),
  name: z.string().min(2, "השם חייב להכיל לפחות 2 תווים"),
  organization: z.string().optional(),
  organizationId: z.string().min(1, "חובה לבחור ארגון"),
  profileId: z.string().optional(),
  mode: z.enum(["BYOK", "MANAGED"]).default("BYOK"),
});

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  password: z.string().min(1, "נא להזין סיסמה"),
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
 * Inquiry-agent process validation schema (gate 1 -> gate 3: draft + guardrails)
 */
export const inquiryAgentProcessSchema = z.object({
  threadId: z.string().min(1, "threadId הוא שדה חובה"),
  ids: z.array(z.string().min(1)).min(1, "יש לבחור לפחות פנייה אחת"),
});

/**
 * Inquiry-agent edit validation schema (gate 3: overwrite a drafted reply)
 */
export const inquiryAgentEditSchema = z.object({
  threadId: z.string().min(1, "threadId הוא שדה חובה"),
  inquiryId: z.string().min(1, "inquiryId הוא שדה חובה"),
  text: z.string().min(1, "הטיוטה לא יכולה להיות ריקה"),
});

/**
 * Inquiry-agent approve validation schema (gate 3 -> end: send approved replies)
 */
export const inquiryAgentApproveSchema = z.object({
  threadId: z.string().min(1, "threadId הוא שדה חובה"),
  ids: z.array(z.string().min(1)).min(1, "יש לבחור לפחות פנייה אחת לאישור"),
});

/**
 * Helper function to validate request body
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((err: z.ZodIssue) => err.message).join(", ");
      throw new Error(messages);
    }
    throw error;
  }
}
