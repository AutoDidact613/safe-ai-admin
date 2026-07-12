import { useTranslation } from 'react-i18next'
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
  onView: () => void
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
  onView,
}: TenderCardProps) {
  const { t } = useTranslation()
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
          <span>{t('tenders.budgetLabel')}</span>
          <strong>{formatBudget(budget)} ש"ח </strong>
        </div>
        <div>
          <span>{t('tenders.timeRequiredLabel')}</span>
          <strong>{formatTimeRequired(timeRequired)}</strong>
        </div>
        <div>
          <span>{t('tenders.applicantsCountLabel')}</span>
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
              {t(`tenders.productTypeOptions.${productType}`, { defaultValue: productType })}
            </span>
          )}
          {aiApplicationType && (
            <span className="domain-pill">
              {t(`tenders.aiApplicationOptions.${aiApplicationType}`, { defaultValue: aiApplicationType })}
            </span>
          )}
        </div>
      )}

      <div className="tender-card__actions" style={{ marginTop: '12px' }}>
        <button type="button" className="details-button" onClick={onView}>
          {t('tenders.detailsButton')}
        </button>
      </div>
    </article>
  )
}