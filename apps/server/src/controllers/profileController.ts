import { Request, Response } from "express";
import logger from "../logger";
import {
  createProfile,
 getProfiles,
  getAllProfiles,
  getAllFullProfiles,
  getProfileById,
  updateProfile,
  deleteProfile,
} from "../services/profileService";

export async function createProfileHandler(req: Request, res: Response) {
  try {
    const profile = await createProfile(req.body);
    res.json({ success: true, profile });
  } catch {
    res.status(500).json({ error: "Failed to create profile" });
  }
}

export async function listProfilesHandler(_req: Request, res: Response) {
    logger.debug("➡️ handler start");

  try {
    const profiles = await getProfiles();
        logger.debug("✅ got profiles");

    res.json(profiles);
  } catch (err) {
        logger.error("❌ error:", { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });

    res.status(500).json({ error: "Failed to fetch profiles" });
  }
}

export async function getProfileHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const profile = await getProfileById(req.params.id);

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(profile);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}

export async function updateProfileHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const profile = await updateProfile(req.params.id, req.body);

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json({ success: true, profile });
  } catch {
    res.status(500).json({ error: "Failed to update profile" });
  }
}

export async function deleteProfileHandler(req: Request<{ id: string }>, res: Response) {
  try {
    await deleteProfile(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}

export async function listAllProfilesHandler(_req: Request, res: Response) {
  logger.debug("➡️ admin handler start - fetching all profiles");

  try {
    const profiles = await getAllProfiles();
    logger.debug("✅ got all profiles (including pending/rejected/internal)");

    res.json(profiles);
  } catch (err) {
    logger.error("❌ error:", { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });

    res.status(500).json({ error: "Failed to fetch all profiles" });
  }
}

export async function listAllFullProfilesHandler(_req: Request, res: Response) {
  logger.debug("➡️ admin handler start - fetching all full profiles with prompts");

  try {
    const profiles = await getAllFullProfiles();
    logger.debug("✅ got all full profiles with prompts and categories");

    res.json(profiles);
  } catch (err) {
    logger.error("❌ error:", { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });

    res.status(500).json({ error: "Failed to fetch all full profiles" });
  }
}
