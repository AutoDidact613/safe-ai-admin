import { useMemo } from 'react'

interface Applicant {
  name: string
  email: string
  details: string
  proposal?: string
  contactMethod?: string
}

interface Tender {
  id: string
  title: string
  publisherUserCode?: string
  shortDescription?: string
  timeRequired?: string
  budget?: string
  domains?: string[]
  agentsRequired?: string[]
  wantsEmails?: boolean
  additionalDetails?: string
  applicants?: Applicant[]
}

interface Props {
  tender: Tender
  onClose: () => void
  onApply: (id: string) => void
}

export default function TenderDetails({ tender, onClose, onApply }: Props) {
  const proposalRange = useMemo(() => {
    if (!tender || !tender.applicants || tender.applicants.length === 0) return null
    const nums = tender.applicants
      .map((a) => {
        if (!a.proposal) return NaN
        const match = a.proposal.match(/[\d,.]+(\.?\d+)?/)
        if (!match) return NaN
        const n = parseFloat(match[0].replace(/,/g, ''))
        return Number.isFinite(n) ? n : NaN
      })
      .filter((n) => !isNaN(n))
    if (nums.length === 0) return null
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    return min === max ? String(min) : `${min} - ${max}`
  }, [tender])

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>{tender.title}</h2>
          </div>
          <div>
            <button type="button" className="tab-button" onClick={onClose}>
              Close
            </button>
          </div>
        </header>

        <section className="modal-section">
          {tender.shortDescription && (
            <p><strong>הסבר:</strong> {tender.shortDescription}</p>
          )}

          <p><strong>תקציב:</strong> {tender.budget}</p>
          <p><strong>זמן נדרש:</strong> {tender.timeRequired}</p>
          <p><strong>נרשמים:</strong> {tender.applicants?.length ?? 0}</p>

          {tender.agentsRequired && tender.agentsRequired.length > 0 && (
            <div className="agents-required">
              <strong> האג'נטים הנדרשים:</strong>
              <div className="agents-list">
                {tender.agentsRequired.map((a) => (
                  <span key={a} className="agent-pill">{a}</span>
                ))}
              </div>
            </div>
          )}

          <p className="mt-12">{tender.additionalDetails}</p>

          <p>
            <strong>טווח הצעות:</strong>{' '}
            {proposalRange ? proposalRange : 'אין הצעות'}
          </p>

          {tender.domains && (
            <div className="domains-list">
              {tender.domains.map((d) => (
                <span key={d} className="domain-pill">{d}</span>
              ))}
            </div>
          )}

          <div className="modal-actions mt-18">
            <button
              type="button"
              className="primary-button"
              onClick={(e) => {
                e.stopPropagation()
                onApply(tender.id)
              }}
            >
              הרשמה למכרז
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
