import { Tender } from './types'

export function getNewOffersCount(tender: Tender): number {
  return tender.applicants?.filter((applicant) => !applicant.isViewed).length ?? 0
}

export function hasNewOffers(tender: Tender): boolean {
  return getNewOffersCount(tender) > 0
}
