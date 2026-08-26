import { useEffect, useRef, useState } from 'react'
import { apiCall, API_ENDPOINTS } from '../../config/api'
import type { Tender } from './types'

interface TenderOffersProps {
  tender: Tender
  onClose: () => void
  onUpdateTender: (updatedTender: Tender) => void
  highlightApplicantId?: string | null
}

export default function TenderOffers({ tender, onClose, onUpdateTender, highlightApplicantId }: TenderOffersProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const highlightedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (highlightApplicantId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightApplicantId])

  // כניסה למסך ההצעות מסמנת אותן כנצפו, כדי שהחיווי ב"המכרזים שלי" יתאפס.
  // מעדכנים את המצב המקומי מיד (ולא מתוך תגובת השרת), כדי לא להסתמך על הצורה
  // המדויקת של המסמך שחוזר מה-API (המכרז המקורי כבר מנורמל ומכיל id תקין).
  useEffect(() => {
    if (!tender.id) return

    apiCall<{ success: boolean; tender: Tender }>(API_ENDPOINTS.tenders.viewOffers(tender.id), {
      method: 'PATCH',
    })
      .then((response) => {
        if (response.success) {
          onUpdateTender({
            ...tender,
            applicants: (tender.applicants ?? []).map((applicant) => ({ ...applicant, isViewed: true })),
          })
        }
      })
      .catch((error) => {
        console.error('Failed to mark tender offers as viewed', error)
        setErrorMessage('לא ניתן היה לסמן את ההצעות כנצפו')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tender.id])

  return (
    <article className="detail-panel content-page-full" style={{ padding: '24px', maxWidth: '95%', margin: '0 auto', boxSizing: 'border-box' }} dir="rtl">
      <header className="detail-panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>הצעות למכרז: {tender.title}</h2>
        <button type="button" className="tab-button" onClick={onClose}>
          חזור לרשימה
        </button>
      </header>

      {errorMessage && (
        <div className="error-message" style={{ color: 'red', background: '#ffebee', padding: '8px 12px', borderRadius: '4px', marginBottom: '16px' }}>
          {errorMessage}
        </div>
      )}

      <section className="applicants-section">
        <h3>מועמדים ({tender.applicants?.length ?? 0})</h3>
        {tender.applicants && tender.applicants.length > 0 ? (
          tender.applicants.map((applicant, index) => {
            const isHighlighted = Boolean(highlightApplicantId) && applicant._id === highlightApplicantId
            return (
              <article
                key={`${applicant.email}-${index}`}
                ref={isHighlighted ? highlightedRef : undefined}
                className="applicant-card"
                style={{
                  padding: '12px',
                  border: isHighlighted ? '2px solid #3498db' : '1px solid #e2e8f0',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  backgroundColor: isHighlighted ? '#eaf4fc' : undefined,
                }}
              >
                <h4>{applicant.name}</h4>
                <p><strong>אימייל:</strong> {applicant.email}</p>
                <p><strong>פרטים:</strong> {applicant.details}</p>
                {applicant.proposal && <p><strong>הצעה:</strong> {applicant.proposal}</p>}
                {applicant.contactMethod && <p><strong>דרכי קשר:</strong> {applicant.contactMethod}</p>}
              </article>
            )
          })
        ) : (
          <p style={{ color: '#666' }}>אין עדיין מועמדים שנרשמו למכרז זה.</p>
        )}
      </section>
    </article>
  )
}
