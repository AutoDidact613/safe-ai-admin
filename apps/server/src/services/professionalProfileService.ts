import mongoose from "mongoose";
import * as repo from "../repositories/professionalProfileRepository";
import { AVATAR_COLOR_PALETTE } from "../models/professionalProfile";
import logger from "../logger";

const MAX_RESUME_FILES = 6;

function pickRandomAvatarColor(): string {
  const index = Math.floor(Math.random() * AVATAR_COLOR_PALETTE.length);
  return AVATAR_COLOR_PALETTE[index]!;
}

export async function getMyProfile(userId: string) {
  return repo.getProfileByUserId(userId);
}

export async function getProfileById(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return repo.getProfileById(id);
}

export async function createProfile(
  userId: string,
  data: { name: string; description?: string; experience?: string; portfolioLink?: string }
) {
  if (!data.name || !data.name.trim()) {
    throw new Error("Name is required");
  }

  const existing = await repo.getProfileByUserId(userId);
  if (existing) {
    throw new Error("Professional profile already exists");
  }

  const profile = await repo.createProfile({
    userId,
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
    experience: data.experience?.trim() || undefined,
    portfolioLink: data.portfolioLink?.trim() || undefined,
    avatarColor: pickRandomAvatarColor(),
    resumeFiles: [],
  });

  logger.info("Professional profile created", { userId });
  return profile;
}

export async function updateProfile(
  userId: string,
  data: { name?: string; description?: string; experience?: string; portfolioLink?: string }
) {
  if (data.name !== undefined && !data.name.trim()) {
    throw new Error("Name is required");
  }

  const updates: Record<string, string | undefined> = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.description !== undefined) updates.description = data.description.trim() || undefined;
  if (data.experience !== undefined) updates.experience = data.experience.trim() || undefined;
  if (data.portfolioLink !== undefined) updates.portfolioLink = data.portfolioLink.trim() || undefined;

  const updated = await repo.updateProfileByUserId(userId, updates);
  if (!updated) {
    throw new Error("Professional profile not found");
  }

  logger.info("Professional profile updated", { userId });
  return updated;
}

export async function addResumeFile(userId: string, fileKey: string, fileName: string) {
  const profile: any = await repo.getProfileByUserId(userId);
  if (!profile) {
    throw new Error("Professional profile not found");
  }
  if (profile.resumeFiles.length >= MAX_RESUME_FILES) {
    throw new Error(`Maximum of ${MAX_RESUME_FILES} resume files allowed`);
  }

  profile.resumeFiles.push({ fileKey, fileName, uploadedAt: new Date() });
  await profile.save();

  logger.info("Resume file added to professional profile", { userId, fileName });
  return profile;
}

export async function removeResumeFile(userId: string, fileKey: string) {
  const profile: any = await repo.getProfileByUserId(userId);
  if (!profile) {
    throw new Error("Professional profile not found");
  }

  profile.resumeFiles = profile.resumeFiles.filter((file: any) => file.fileKey !== fileKey);
  await profile.save();

  logger.info("Resume file removed from professional profile", { userId, fileKey });
  return profile;
}
