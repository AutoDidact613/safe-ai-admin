import { Request, Response } from "express";
import {
  getMyProfile,
  createProfile,
  updateProfile,
  addResumeFile,
  removeResumeFile,
} from "../services/professionalProfileService";
import logger from "../logger";

export async function getMyProfileHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    const profile = await getMyProfile(userId);
    res.json(profile);
  } catch (error: any) {
    logger.error("Get professional profile failed", { error: error.message });
    res.status(500).json({ error: "Failed to fetch professional profile" });
  }
}

export async function createProfileHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    const profile = await createProfile(userId, req.body);
    res.status(201).json({ success: true, profile });
  } catch (error: any) {
    logger.error("Create professional profile failed", { error: error.message });
    res.status(400).json({ error: error.message || "Failed to create professional profile" });
  }
}

export async function updateProfileHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    const profile = await updateProfile(userId, req.body);
    res.json({ success: true, profile });
  } catch (error: any) {
    logger.error("Update professional profile failed", { error: error.message });
    res.status(400).json({ error: error.message || "Failed to update professional profile" });
  }
}

export async function addResumeFileHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    const { fileKey, fileName } = req.body;

    if (!fileKey || !fileName) {
      return res.status(400).json({ error: "fileKey and fileName are required" });
    }

    const profile = await addResumeFile(userId, fileKey, fileName);
    res.status(201).json({ success: true, profile });
  } catch (error: any) {
    logger.error("Add resume file failed", { error: error.message });
    res.status(400).json({ error: error.message || "Failed to add resume file" });
  }
}

export async function removeResumeFileHandler(req: Request<{ fileKey: string }>, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    const { fileKey } = req.params;

    const profile = await removeResumeFile(userId, decodeURIComponent(fileKey));
    res.json({ success: true, profile });
  } catch (error: any) {
    logger.error("Remove resume file failed", { error: error.message });
    res.status(400).json({ error: error.message || "Failed to remove resume file" });
  }
}
