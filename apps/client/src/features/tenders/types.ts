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
}
