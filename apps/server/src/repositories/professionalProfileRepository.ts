import { ProfessionalProfile } from "../models/professionalProfile";

export async function getProfileByUserId(userId: string) {
  return ProfessionalProfile.findOne({ userId });
}

export async function getProfileById(id: string) {
  return ProfessionalProfile.findById(id);
}

export async function createProfile(data: Record<string, unknown>) {
  return ProfessionalProfile.create(data);
}

export async function updateProfileByUserId(userId: string, updates: Record<string, unknown>) {
  return ProfessionalProfile.findOneAndUpdate({ userId }, updates, { new: true });
}
