import type { ProfessionalProfile, RawProfessionalProfile } from './types'

export const normalizeProfile = (raw: RawProfessionalProfile): ProfessionalProfile => ({
  id: raw.id ?? raw._id ?? '',
  name: raw.name,
  description: raw.description,
  experience: raw.experience,
  portfolioLink: raw.portfolioLink,
  resumeFiles: raw.resumeFiles ?? [],
  avatarColor: raw.avatarColor,
})
