import type { TenderTime } from './types'

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

const formatTimeRequired = (time?: TenderTime): string => {
  if (!time) return '—'
  const unit = time.value === 1 ? singularUnit(time.unit) : time.unit
  return time.value === 1 ? `${unit}` : `${time.value} ${unit}`
}

const formatBudget = (budget?: number): string => {
  return budget === undefined || budget === null ? '—' : budget.toString()
}

interface TenderCardProps {
  id: string
  title: string
  publisherUserCode?: string
  shortDescription?: string
  timeRequired?: TenderTime
  budget?: number
  productType?: string
  aiApplicationType?: string
  wantsEmails?: boolean
  applicantsCount?: number
  newOffersCount?: number
  onView: () => void
  onViewOffers?: () => void
}

export default function Card({
  id,
  title,
  shortDescription,
  timeRequired,
  budget,
  productType,
  aiApplicationType,
  applicantsCount = 0,
  newOffersCount = 0,
  onView,
  onViewOffers,
}: TenderCardProps) {
  return (
    <article 
      className="tender-card" 
      aria-labelledby={`tender-${id}`} 
      style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
    >
      <div className="tender-card__header">
        <div>
          <h3 id={`tender-${id}`}>{title}</h3>
        </div>
      </div>

      {/* תיבת טקסט מוגבלת בגובה עם גלילה פנימית עבור תיאורים ארוכים */}
      {shortDescription && (
        <div 
          className="tender-card__summary-wrapper" 
          style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '12px', paddingLeft: '4px' }}
        >
          <p className="tender-card__summary" style={{ margin: 0 }}>{shortDescription}</p>
        </div>
      )}

      <div className="tender-card__meta">
        <div>
          <span>תקציב</span>
          <strong>{formatBudget(budget)} ש"ח </strong>
        </div>
        <div>
          <span>זמן נדרש</span>
          <strong>{formatTimeRequired(timeRequired)}</strong>
        </div>
        <div>
          <span> הצעות: </span>
          <strong>{applicantsCount}</strong>
        </div>
        <div>
          <span>&nbsp;</span>
          <strong>&nbsp;</strong>
        </div>
      </div>

      {(productType || aiApplicationType) && (
        <div className="tender-card__tags" style={{ marginTop: 'auto', paddingTop: '10px' }}>
          {productType && (
            <span className="domain-pill" style={{ backgroundColor: '#f1f5f9', color: '#334155', borderColor: '#cbd5e1' }}>
              {productType}
            </span>
          )}
          {aiApplicationType && (
            <span className="domain-pill">
              {aiApplicationType}
            </span>
          )}
        </div>
      )}

      <div className="tender-card__actions" style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
        <button type="button" className="details-button" onClick={onView}>
          פרטי מכרז
        </button>
        {onViewOffers && (
          <button
            type="button"
            className="details-button"
            onClick={onViewOffers}
            style={{ position: 'relative' }}
          >
            הצעות
            {newOffersCount > 0 && (
              <span
                aria-label={`${newOffersCount} הצעות חדשות`}
                style={{
                  position: 'absolute',
                  top: '-8px',
                  insetInlineEnd: '-8px',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 4px',
                  borderRadius: '9px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                {newOffersCount}
              </span>
            )}
          </button>
        )}
      </div>
    </article>
  )
}