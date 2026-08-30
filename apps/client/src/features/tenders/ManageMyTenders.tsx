import { useMemo, useState } from 'react'
import Card from './Card'
import ManageTenderDetails from './ManageTenderDetails.tsx'
import TenderOffers from './TenderOffers.tsx'
import { getNewOffersCount, hasNewOffers } from './offersUtils'
import type { Tender } from './types'

interface Props {
  currentUserCode: string
  tenders: Tender[]
  onUpdateTender: (updatedTender: Tender) => void
  onDeleteTender: (deletedTenderId: string) => void
}

export default function ManageMyTenders({ currentUserCode, tenders, onUpdateTender, onDeleteTender }: Props) {
  // סינון מכרזים השייכים למשתמש ושהם פעילים (isActive אינו false)
  const publishedTenders = useMemo(
    () => tenders.filter((tender) => tender.publisherUserCode === currentUserCode && tender.isActive !== false),
    [tenders, currentUserCode],
  )

  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null)
  const [selectedOffersTenderId, setSelectedOffersTenderId] = useState<string | null>(null)

  const selectedTender = useMemo(
    () => publishedTenders.find((tender) => tender.id === selectedTenderId) ?? null,
    [publishedTenders, selectedTenderId],
  )

  const selectedOffersTender = useMemo(
    () => publishedTenders.find((tender) => tender.id === selectedOffersTenderId) ?? null,
    [publishedTenders, selectedOffersTenderId],
  )

  // סך כל ההצעות החדשות (שלא נצפו) על פני כל המכרזים של המשתמש
  const totalNewOffers = useMemo(
    () => publishedTenders.reduce((sum, tender) => sum + getNewOffersCount(tender), 0),
    [publishedTenders],
  )

  const tendersWithNewOffers = useMemo(
    () => publishedTenders.filter(hasNewOffers),
    [publishedTenders],
  )

  // במידה ונבחר מכרז, נציג את עמוד הפירוט והעדכון המלא
  if (selectedTender) {
    return (
      <ManageTenderDetails
        tender={selectedTender}
        onClose={() => setSelectedTenderId(null)}
        onUpdateTender={onUpdateTender}
        onDeleteTender={onDeleteTender}
      />
    )
  }

  // במידה ונבחרו הצעות לצפייה, נציג את המסך המצומצם המוקדש להצעות
  if (selectedOffersTender) {
    return (
      <TenderOffers
        tender={selectedOffersTender}
        onClose={() => setSelectedOffersTenderId(null)}
        onUpdateTender={onUpdateTender}
      />
    )
  }

  return (
    <section className="manage-shell">
      <div className="manage-header">
        <div>
          <h1>המכרזים שלי</h1>
        </div>
        <div className="manage-summary">
          {publishedTenders.length}
          <strong>סה"כ מכרזים פעילים:</strong>
        </div>
      </div>

      {totalNewOffers > 0 && (
        <div
          className="new-offers-banner"
          style={{
            marginTop: '16px',
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <strong style={{ color: 'var(--color-warning)', fontSize: '15px' }}>
            יש לך {totalNewOffers} הצעות חדשות
          </strong>
          <ul style={{ margin: 0, paddingInlineStart: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {tendersWithNewOffers.map((tender) => (
              <li key={tender.id} style={{ color: 'var(--color-warning)', fontSize: '14px' }}>
                יש {getNewOffersCount(tender)} הצעות חדשות למכרז: <strong>{tender.title}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="manage-content-full-width" style={{ marginTop: '20px' }}>
        <div className="manage-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {publishedTenders.length > 0 ? (
            publishedTenders.map((tender) => (
              <Card
                key={tender.id}
                id={tender.id}
                title={tender.title}
                shortDescription={tender.shortDescription}
                timeRequired={tender.timeRequired}
                budget={tender.budget}
                productType={tender.productType}
                aiApplicationType={tender.aiApplicationType}
                applicantsCount={tender.applicants?.length ?? 0}
                newOffersCount={getNewOffersCount(tender)}
                onView={() => setSelectedTenderId(tender.id)}
                onViewOffers={() => setSelectedOffersTenderId(tender.id)}
              />
            ))
          ) : (
            <div className="empty-state" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
              <h2>אין מכרזים פעילים</h2>
              <p>לא נמצאו מכרזים פעילים עם קוד משתמש זה. נסה להוסיף או לפרסם מכרז חדש.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
