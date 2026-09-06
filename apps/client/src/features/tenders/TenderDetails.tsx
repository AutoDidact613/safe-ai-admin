import { useMemo } from 'react'
import type { Applicant, Tender } from './types'

interface Props {
  tender: Tender
  onClose: () => void
  onApply: (id: string) => void
  currentUserId?: string
  onViewMyApplication: (applicant: Applicant) => void
}

const singularUnit = (unit: string): string => {
  switch (unit) {
    case 'שעות':
      return 'שעה'
    case 'ימים':
      return 'יום'
    case 'שבועות':
      return 'שבוע'
    case 'חודשים':
      return 'חודש'
    case 'שנים':
      return 'שנה'
    default:
      return unit
  }
}

const formatTimeRequired = (time?: Tender['timeRequired']): string => {
  if (!time) return '—'
  const unit = time.value === 1 ? singularUnit(time.unit) : time.unit
  return time.value === 1 ? `${unit}` : `${time.value} ${unit}`
}

const formatBudget = (budget?: number): string => {
  return budget === undefined || budget === null ? '—' : budget.toString()
}

const formatAppliedAt = (appliedAt?: string): string => {
  if (!appliedAt) return '—'
  const date = new Date(appliedAt)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('he-IL')
}

export default function TenderDetails({ tender, onClose, onApply, currentUserId, onViewMyApplication }: Props) {
  const myApplication = useMemo(
    () => tender.applicants?.find((a) => currentUserId && a.userId === currentUserId),
    [tender, currentUserId],
  )

  // מעדיף את tender.proposalRange/applicantsCount שמחושבים בשרת מהמערך המלא -
  // ה-applicants שמגיע ללקוח עשוי להיות מסונן לרשומה של המשתמש הנוכחי בלבד.
  const proposalRange = useMemo(() => {
    if (tender.proposalRange !== undefined) {
      const range = tender.proposalRange
      if (!range) return null
      return range.min === range.max ? String(range.min) : `${range.min} - ${range.max}`
    }

    if (!tender || !tender.applicants || tender.applicants.length === 0) return null
    const nums = tender.applicants
      .map((a) => {
        if (!a.proposal || typeof a.proposal !== 'number') return NaN
        return Number.isFinite(a.proposal) ? a.proposal : NaN
      })
      .filter((n) => !isNaN(n))
    if (nums.length === 0) return null
    const min = Math.min(...nums)
    const max = Math.max(...nums)
    return min === max ? String(min) : `${min} - ${max}`
  }, [tender])

  const applicantsCount = tender.applicantsCount ?? tender.applicants?.length ?? 0

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
              <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{tender.shortDescription}</p>
            </div>
          )}

          {/* גריד נתונים יבש */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>תקציב</span>
              <strong>{formatBudget(tender.budget)}</strong>
            </div>
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>זמן נדרש</span>
              <strong>{formatTimeRequired(tender.timeRequired)}</strong>
            </div>
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>רשומים לפרויקט</span>
              <strong>{applicantsCount} מועמדים</strong>
            </div>
            <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>טווח הצעות</span>
              <strong>{proposalRange ? proposalRange : 'אין הצעות'}</strong>
            </div>
          </div>

          {/* תגיות סיווג מוצר ו-AI */}
          {(tender.productType || tender.aiApplicationType) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', borderTop: '1px solid var(--border-muted)', paddingTop: '14px' }}>
              {tender.productType && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>סוג מוצר:</span>
                  <span className="domain-pill" style={{ backgroundColor: 'var(--gray-100)', color: 'var(--text-secondary)', borderColor: 'var(--border-strong)' }}>{tender.productType}</span>
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
            <div className="agents-required" style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '14px' }}>
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
            <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '14px' }}>
              <strong>פרטים נוספים:</strong>
              <p style={{ marginTop: '8px', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{tender.additionalDetails}</p>
            </div>
          )}

          {/* אפיון ראשוני והמלצת פיתוח - מוצג למועמדים רק אם בעל המכרז בחר לפרסם אותו (SCRUM-291) */}
          {tender.specification?.status === 'ready' && tender.specification.isPublished && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <strong>אפיון ראשוני והמלצת פיתוח:</strong>

              {tender.specification.techStackRecommendation && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>המלצה טכנולוגית: </span>
                  <span style={{ color: '#475569' }}>{tender.specification.techStackRecommendation}</span>
                </div>
              )}

              {!!tender.specification.openSourceReferences?.length && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>פרויקטים דומים בקוד פתוח:</span>
                  <ul style={{ margin: '6px 0 0', paddingRight: '20px' }}>
                    {tender.specification.openSourceReferences.map((ref) => (
                      <li key={ref.url}>
                        <a href={ref.url} target="_blank" rel="noopener noreferrer">{ref.title}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!!tender.specification.readingSources?.length && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>מקורות קריאה מומלצים:</span>
                  <ul style={{ margin: '6px 0 0', paddingRight: '20px' }}>
                    {tender.specification.readingSources.map((ref) => (
                      <li key={ref.url}>
                        <a href={ref.url} target="_blank" rel="noopener noreferrer">{ref.title}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tender.specification.document && (
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', background: 'var(--secondary-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                  {tender.specification.document}
                </pre>
              )}
            </div>
          )}

          {/* כפתורי פעולה תחתונה */}
          <div className="modal-actions mt-18" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '10px' }}>
            {myApplication ? (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  הגשת הצעה בתאריך {formatAppliedAt(myApplication.appliedAt)}
                </span>
                <button
                  type="button"
                  className="primary-button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewMyApplication(myApplication)
                  }}
                >
                  לצפייה בהצעה שהגשתי
                </button>
              </>
            ) : (
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
            )}
          </div>
        </section>
      </div>
    </div>
  )
}