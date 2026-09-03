import type { Applicant, Tender } from './types'

interface Props {
  tender: Tender
  applicant: Applicant
  onClose: () => void
}

const formatAppliedAt = (appliedAt?: string): string => {
  if (!appliedAt) return '—'
  const date = new Date(appliedAt)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('he-IL')
}

export default function ViewMyApplication({ tender, applicant, onClose }: Props) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>ההצעה שהגשתי</h2>
            <p>{tender.title}</p>
          </div>
          <div>
            <button type="button" className="tab-button" onClick={onClose}>
              סגור
            </button>
          </div>
        </header>

        <section className="modal-section apply-form">
          <div className="form-grid">
            <div className="form-field">
              <span className="form-label">תאריך הגשה</span>
              <p className="form-input view-application__value">{formatAppliedAt(applicant.appliedAt)}</p>
            </div>

            <div className="form-field">
              <span className="form-label">שם</span>
              <p className="form-input view-application__value">{applicant.name}</p>
            </div>

            <div className="form-field">
              <span className="form-label">אימייל</span>
              <p className="form-input view-application__value">{applicant.email}</p>
            </div>

            <div className="form-field form-full">
              <span className="form-label">פרטים</span>
              <p className="form-textarea view-application__value" style={{ whiteSpace: 'pre-line' }}>{applicant.details}</p>
            </div>

            <div className="form-field">
              <span className="form-label">הצעה - בשקלים</span>
              <p className="form-input view-application__value">{applicant.proposal ?? '—'}</p>
            </div>

            <div className="form-field">
              <span className="form-label">אמצעי תקשורת</span>
              <p className="form-input view-application__value">{applicant.contactMethod ?? '—'}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
