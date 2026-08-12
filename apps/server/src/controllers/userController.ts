import { Request, Response } from "express";
import { createUser, listUsers, getUserById, updateUser, deleteUser } from "../services/userService";
import { sanitizeUser } from "../utils/sanitizeUser";
import logger from "../logger";

export async function createUserHandler(req: Request, res: Response) {
  try {
    const result = await createUser(req.body);

    res.json({
      success: true,
      user: sanitizeUser(result.user?.toObject ? result.user.toObject() : result.user),
      proxyApiKey: result.proxyApiKey,
    });
  } catch {
    res.status(500).json({ error: "Failed to create user" });
  }
}
export async function listUsersHandler(_req: Request, res: Response) {
  try {
    const users = await listUsers();
    res.json(users.map(sanitizeUser));
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

export async function getUserHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const user = await getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(sanitizeUser(user));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}

export async function updateUserHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const user = await updateUser(req.params.id, req.body);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, user: sanitizeUser(user) });
  } catch {
    res.status(500).json({ error: "Failed to update user" });
  }
}

export async function deleteUserHandler(req: Request<{ id: string }>, res: Response) {
  try {
    await deleteUser(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}

export async function updateOwnProfileHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const userId = (req as any).user?.userId;

    // Ensure user can only update their own profile
    if (userId !== req.params.id) {
      return res.status(403).json({ error: "You can only update your own profile" });
    }

    // Only allow updating specific fields (not admin fields)
    const allowedFields = ['profileId', 'name', 'organization'];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const user = await updateUser(req.params.id, updateData);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(sanitizeUser(user));
  } catch (err) {
    logger.error("Error updating profile:", { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
    res.status(500).json({ error: "Failed to update profile" });
  }
}
