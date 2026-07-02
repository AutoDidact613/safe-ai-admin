import { useState } from 'react'
import type { FormEvent } from 'react'

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
  onSubmit: (applicant: Applicant) => void
  onCancel: () => void
}

export default function ApplyForTender({ tender, onSubmit, onCancel }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [details, setDetails] = useState('')
  const [proposal, setProposal] = useState('')
  const [contactMethod, setContactMethod] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name || !email || !details) return
    onSubmit({ name, email, details, proposal: proposal || undefined, contactMethod: contactMethod || undefined })
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>הרשמה למכרז</h2>
            <p>{tender.title}</p>
          </div>
          <div>
            <button type="button" className="tab-button" onClick={onCancel}>
              Close
            </button>
          </div>
        </header>

        <form className="modal-section apply-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span className="form-label">שם</span>
              <input
                className="form-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="שם מלא"
                required
              />
            </label>

            <label className="form-field">
              <span className="form-label">אימייל</span>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                required
              />
            </label>

            <label className="form-field form-full">
              <span className="form-label">פרטים</span>
              <textarea
                className="form-textarea"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="ספר לנו על עצמך וההצעה שלך"
                required
                rows={5}
              />
            </label>

            <label className="form-field">
              <span className="form-label">הצעה</span>
              <input
                className="form-input"
                type="text"
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                placeholder="כמה תרצה לגבות עבור העבודה"
              />
            </label>

            <label className="form-field">
              <span className="form-label">אמצעי תקשורת</span>
              <input
                className="form-input"
                type="text"
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
                placeholder="טלפון / אימייל"
              />
            </label>
          </div>

          <div className="modal-actions mt-18 actions-row">
            <button type="submit" className="primary-button">
              הגש מועמדות
            </button>
            <button type="button" className="secondary-button" onClick={onCancel}>
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
