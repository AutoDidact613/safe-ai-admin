/**
 * IP-based rate limiting for public authentication endpoints.
 * These routes run before a JWT exists, so the DB-backed per-user
 * rateLimiter middleware (which requires req.user) cannot protect them.
 */

import rateLimit from "express-rate-limit";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Please try again later." },
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset attempts. Please try again later." },
});

// Each successful call creates a pending WalletTransaction row and a
// PayMe generate-sale request - cap how many an org/IP can spam.
export const paymeInitiateRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many top-up attempts. Please try again later." },
});

// Called by PayMe itself, so this is a flood guard rather than a normal
// per-user cap - kept high enough not to drop legitimate callbacks.
export const paymeWebhookRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many webhook requests." },
});
