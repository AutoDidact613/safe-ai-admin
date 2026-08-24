/**
 * JWT Authentication Middleware
 * Used for protecting admin panel and management routes
 */

import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
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

    const user = await User.findById(authUser.userId).select(field).lean();
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
