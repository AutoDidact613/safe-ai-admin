import { AIProfile, AIProfileDoc } from "../models/aiProfile";

// type CreateProfileInput = Omit<AIProfileDoc, keyof Document>;

export async function createProfile(data: Partial<AIProfileDoc>) {
  return AIProfile.create(data);
}

export async function getProfiles() {
  return AIProfile.find({
    approvalStatus: 'approved',
    visibility: 'public'
  }).sort({ createdAt: -1 }).lean();
}

export async function getProfileById(profileId: string) {
  return AIProfile.findById(profileId).lean();
}

export async function getProfileByName(name: string) {
  return AIProfile.findOne({ name: name.trim() }).lean();
}

export async function updateProfile(profileId: string, data: Partial<AIProfileDoc>) {
  return AIProfile.findByIdAndUpdate(profileId, data, {
    new: true,
    runValidators: true,
  }).lean();
}

export async function deleteProfile(profileId: string) {
  return AIProfile.findByIdAndDelete(profileId).lean();
}

// Full profile includes the fields that are normally excluded for security reasons (like allowed/blocked categories and prompts)

export async function getFullProfileById(profileId: string) {
  return AIProfile.findById(profileId)
    .select(
      "+allowedCategories +blockedCategories +contentPrompts +behaviorPrompts +knowledgePrompts"
    )
    .lean();
}

export async function getFullProfiles() {
  return AIProfile.find({
    approvalStatus: 'approved',
    visibility: 'public'
  })
    .select(
      "+allowedCategories +blockedCategories +contentPrompts +behaviorPrompts +knowledgePrompts"
    )
    .sort({ createdAt: -1 })
    .lean();
}

export async function getAllProfiles() {
  return AIProfile.find()
    .sort({ createdAt: -1 })
    .lean();
}

export async function getAllFullProfiles() {
  return AIProfile.find()
    .select(
      "+allowedCategories +blockedCategories +contentPrompts +behaviorPrompts +knowledgePrompts"
    )
    .sort({ createdAt: -1 })
    .lean();
}
