/**
 * server/src/middleware/authMiddleware.ts
 *
 * Example middleware placeholder for request authentication.
 * Extend with real authentication checks (API key, JWT, session, etc.).
 */

import { Request, Response, NextFunction } from "express";
import { getUserByProxyKeyHash } from "../repositories/userRepository";
import { hashApiKey } from "../utils/crypto";

// Placeholder auth middleware. Extend with real auth logic as needed.
export  async function proxyAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing API key" });
  }

  const key = auth.slice("Bearer ".length).trim();

  if (!key) {
    return res.status(401).json({ error: "Missing API key" });
  }

  const proxyKeyHash = hashApiKey(key);
  const user = await getUserByProxyKeyHash(proxyKeyHash);

  if (!user) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  (req as any).user = user;

  next();
}

