export type TenderTimeUnit = 'שעות' | 'ימים' | 'שבועות' | 'חודשים' | 'שנים'

export interface TenderTime {
  value: number
  unit: TenderTimeUnit
}

export interface AttachedProfileSummary {
  name: string
  description?: string
  experience?: string
}

export interface Applicant {
  _id?: string
  name: string
  email: string
  details: string
  proposal?: number
  contactMethod?: string
  resumeFileKey?: string
  portfolioLink?: string
  professionalProfileId?: string
  professionalProfile?: AttachedProfileSummary
  isViewed?: boolean
  userId?: string
  appliedAt?: string
}

export interface ProposalRange {
  min: number
  max: number
}

export interface TenderReference {
  title: string
  url: string
  description?: string
}

export type TenderSpecificationStatus = 'pending' | 'generating' | 'ready' | 'failed'

export interface TenderSpecification {
  status: TenderSpecificationStatus
  techStackRecommendation?: string
  openSourceReferences?: TenderReference[]
  readingSources?: TenderReference[]
  document?: string
  errorMessage?: string
  generatedAt?: string
  isPublished?: boolean
}

export interface Tender {
  id: string
  title: string
  publisherUserCode?: string
  shortDescription?: string
  timeRequired?: TenderTime
  budget?: number
  productType?: string
  aiApplicationType?: string
  isActive?: boolean
  agentsRequired?: string[]
  wantsEmails?: boolean
  additionalDetails?: string
  applicants?: Applicant[]
  applicantsCount?: number
  proposalRange?: ProposalRange | null
  domains?: string[]
  specification?: TenderSpecification
}

export interface RawTender {
  id?: string
  _id?: string
  title: string
  publisherUserCode?: string
  shortDescription?: string
  timeRequired?: TenderTime
  budget?: number
  productType?: string
  aiApplicationType?: string
  isActive?: boolean
  agentsRequired?: string[]
  wantsEmails?: boolean
  additionalDetails?: string
  applicants?: Applicant[]
  applicantsCount?: number
  proposalRange?: ProposalRange | null
  specification?: TenderSpecification
}
