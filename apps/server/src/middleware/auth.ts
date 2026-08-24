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

    const user = await User.findById(authUser.userId).select(field).lean();

    if (!user || !(user as any)[field]) {
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
