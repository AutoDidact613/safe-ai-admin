/**
 * server/src/services/profileService.ts
 *
 * Service layer for working with AI profiles in the database.
 */
import { AIProfile } from "../models";

export async function createProfile(data: any) {
  return AIProfile.create(data);
}

export async function getProfiles() {
  return AIProfile.find({
    approvalStatus: 'approved',
    visibility: 'public'
  }).sort({ createdAt: -1 }).lean();
}

export async function getAllProfiles() {
  return AIProfile.find().sort({ createdAt: -1 }).lean();
}

export async function getAllFullProfiles() {
  return AIProfile.find()
    .select(
      "+allowedCategories +blockedCategories +contentPrompts +behaviorPrompts +knowledgePrompts"
    )
    .sort({ createdAt: -1 })
    .lean();
}

export async function getProfileById(profileId: string) {
  return AIProfile.findById(profileId).lean();
}

export async function updateProfile(profileId: string, data: any) {
  return AIProfile.findByIdAndUpdate(profileId, data, {
    new: true,
    runValidators: true,
  }).lean();
}

export async function deleteProfile(profileId: string) {
  return AIProfile.findByIdAndDelete(profileId);
}
