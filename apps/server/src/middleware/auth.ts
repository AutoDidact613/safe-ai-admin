/**
 * JWT Authentication Middleware
 * Used for protecting admin panel and management routes
 */

import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { verifyAccessToken } from "../utils/jwt";
import { constantTimeEqual } from "../utils/crypto";
import { User } from "../models/user";

/**
 * Middleware to authenticate JWT token
 * Attaches user info to req.user
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access token required" });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = verifyAccessToken(token);
    (req as any).user = decoded; // { userId, email, role }
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware to require admin role
 * Must be used after authenticateToken
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as any).user;

  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

/**
 * Middleware for agent-facing routes (e.g. tender-spec-agent's
 * GET /tender-board/:id/agent-context and POST /tender-board/:id/specification):
 * accepts EITHER a static, non-expiring shared secret (AGENT_SERVICE_TOKEN) meant for
 * trusted agent subprocesses, OR a normal admin JWT (falls back to authenticateToken +
 * requireAdmin) for manual debugging via curl/Postman with a human admin session.
 *
 * The static-secret path exists because a real user access token always expires in
 * ACCESS_TOKEN_EXPIRY (15m, see utils/jwt.ts) - fine for a browser session that
 * refreshes itself, but unworkable for a subprocess with no one to log back in every
 * 15 minutes. AGENT_SERVICE_TOKEN is independently rotatable (unlike baking a
 * never-expiring role:"admin" JWT, which could only be revoked by rotating JWT_SECRET
 * and invalidating every real user's session at once).
 */
export function requireAdminOrServiceToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : undefined;
  const serviceToken = process.env.AGENT_SERVICE_TOKEN;

  if (token && serviceToken && constantTimeEqual(token, serviceToken)) {
    (req as any).user = { userId: "agent-service", email: "agent-service", role: "admin" };
    return next();
  }

  authenticateToken(req, res, () => requireAdmin(req, res, next));
}

/**
 * Middleware to require user to be active
 * Can be extended to check user.isActive from database
 */
export function requireActiveUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Additional checks can be added here
  // e.g., check if user.isActive in database

  next();
}

/**
 * canCreatePosts is opt-in (forbidden unless explicitly granted); canComment
 * is opt-out (allowed unless explicitly revoked). Reads go through .lean(),
 * which returns the raw stored document and does NOT apply the schema's
 * `default` for a field that was never written - so an existing user from
 * before this field existed comes back with the field simply absent. This
 * map is what "absent" should resolve to for each field, independent of the
 * schema default (which only affects documents created from now on).
 */
const FORUM_PERMISSION_DEFAULT_WHEN_UNSET: Record<"canCreatePosts" | "canComment", boolean> = {
  canCreatePosts: false,
  canComment: true,
};

/**
 * Middleware factory that blocks the request unless the authenticated user's
 * live DB record has the given forum permission flag set to true.
 * Must be used after authenticateToken. Checks the database (not the JWT
 * payload) so a permission revoked by an admin takes effect immediately,
 * without waiting for the user's access token to expire.
 */
export function requireForumPermission(field: "canCreatePosts" | "canComment") {
  return async function (req: Request, res: Response, next: NextFunction) {
    const authUser = (req as any).user;

    if (!authUser?.userId) {
      return res.status(401).json({ error: "Access token required" });
    }

    // Admins always have full forum access, regardless of the stored flag.
    if (authUser.role === "admin") {
      return next();
    }

    try {
      const user = mongoose.Types.ObjectId.isValid(authUser.userId)
        ? await User.findById(authUser.userId).select(field).lean()
        : null;
      const value = user ? (user as any)[field] : undefined;
      const allowed = value === undefined ? FORUM_PERMISSION_DEFAULT_WHEN_UNSET[field] : value === true;

      if (!allowed) {
        return res.status(403).json({
          error:
            field === "canCreatePosts"
              ? "אין לך הרשאה לפרסם פוסטים חדשים"
              : "אין לך הרשאה להגיב לפוסטים",
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: "Failed to verify forum permissions" });
    }
  };
}

/**
 * Middleware to require organization owner role
 * Must be used after authenticateToken
 */
export function requireOrgOwner(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = (req as any).user;

  if (!user || (user.role !== "org_owner" && user.role !== "admin")) {
    return res.status(403).json({ error: "Organization owner access required" });
  }

  next();
}
