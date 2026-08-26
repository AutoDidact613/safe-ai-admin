export type TenderTimeUnit = 'שעות' | 'ימים' | 'שבועות' | 'חודשים' | 'שנים'

export interface TenderTime {
  value: number
  unit: TenderTimeUnit
}

export interface Applicant {
  name: string
  email: string
  details: string
  proposal?: number
  contactMethod?: string
  resumeFileKey?: string
  portfolioLink?: string
  isViewed?: boolean
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
}
