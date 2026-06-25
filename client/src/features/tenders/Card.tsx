interface TenderCardProps {
  id: string
  title: string
  publisherUserCode?: string
  shortDescription?: string
  timeRequired?: string
  budget?: string
  domains?: string[]
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
  domains = [],
  applicantsCount = 0,
  onView,
}: TenderCardProps) {
  return (
    <article className="tender-card" aria-labelledby={`tender-${id}`}>
      <div className="tender-card__header">
        <div>
          <h3 id={`tender-${id}`}>{title}</h3>
        </div>
      </div>

      {shortDescription && <p className="tender-card__summary">{shortDescription}</p>}

      <div className="tender-card__meta">
        <div>
          <span>תקציב</span>
          <strong>{budget ?? '—'}</strong>
        </div>
        <div>
          <span>זמן נדרש</span>
          <strong>{timeRequired ?? '—'}</strong>
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

      {domains.length > 0 && (
        <div className="tender-card__tags">
          {domains.slice(0, 7).map((d) => (
            <span key={d} className="domain-pill">
              {d}
            </span>
          ))}
        </div>
      )}

      <div className="tender-card__actions">
        <button type="button" className="details-button" onClick={onView}>
          View details
        </button>
      </div>
    </article>
  )
}
