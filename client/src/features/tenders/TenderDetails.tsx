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
  productType?: string
  aiApplicationType?: string
  isActive?: boolean
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
    <div role="dialog" aria-modal="true" className="modal-overlay" onClick={onClose} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', borderRadius: 'var(--radius-lg)' }}>
        <header className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{tender.title}</h2>
          </div>
          <div>
            <button type="button" className="tab-button" onClick={onClose}>
              סגור
            </button>
          </div>
        </header>

        <section className="modal-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* תיאור קצר והסבר */}
          {tender.shortDescription && (
            <div style={{ background: 'var(--secondary-bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <strong>הסבר על הפרויקט:</strong>
              <p style={{ margin: '8px 0 0', color: '#475569', lineHeight: '1.6' }}>{tender.shortDescription}</p>
            </div>
          )}

          {/* גריד נתונים יבש */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>תקציב</span>
              <strong>{tender.budget ?? '—'}</strong>
            </div>
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>זמן נדרש</span>
              <strong>{tender.timeRequired ?? '—'}</strong>
            </div>
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>רשומים לפרויקט</span>
              <strong>{tender.applicants?.length ?? 0} מועמדים</strong>
            </div>
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>טווח הצעות</span>
              <strong>{proposalRange ? proposalRange : 'אין הצעות'}</strong>
            </div>
          </div>

          {/* תגיות סיווג מוצר ו-AI */}
          {(tender.productType || tender.aiApplicationType) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              {tender.productType && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>סוג מוצר:</span>
                  <span className="domain-pill" style={{ backgroundColor: '#f1f5f9', color: '#334155', borderColor: '#cbd5e1' }}>{tender.productType}</span>
                </div>
              )}
              {tender.aiApplicationType && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>יישום AI:</span>
                  <span className="domain-pill">{tender.aiApplicationType}</span>
                </div>
              )}
            </div>
          )}

          {/* סעיף אג'נטים נדרשים */}
          {tender.agentsRequired && tender.agentsRequired.length > 0 && (
            <div className="agents-required" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <strong style={{ display: 'block', marginBottom: '8px' }}>האג'נטים הנדרשים:</strong>
              <div className="agents-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {tender.agentsRequired.map((a) => (
                  <span key={a} className="agent-pill">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* פרטים נוספים חופשיים */}
          {tender.additionalDetails && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <strong>פרטים נוספים:</strong>
              <p style={{ marginTop: '8px', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{tender.additionalDetails}</p>
            </div>
          )}

          {/* כפתורי פעולה תחתונה */}
          <div className="modal-actions mt-18" style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '10px' }}>
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