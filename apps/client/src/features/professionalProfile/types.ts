export interface ResumeFile {
  fileKey: string
  fileName: string
  uploadedAt?: string
}

export interface ProfessionalProfile {
  id: string
  name: string
  description?: string
  experience?: string
  portfolioLink?: string
  resumeFiles: ResumeFile[]
  avatarColor: string
}

export interface RawProfessionalProfile {
  id?: string
  _id?: string
  name: string
  description?: string
  experience?: string
  portfolioLink?: string
  resumeFiles?: ResumeFile[]
  avatarColor: string
}
