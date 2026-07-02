import { useMemo, useState } from 'react'
import Card from './Card'
import ManageTenderDetails from './ManageTenderDetails.tsx'

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

  const selectedTender = useMemo(
    () => publishedTenders.find((tender) => tender.id === selectedTenderId) ?? null,
    [publishedTenders, selectedTenderId],
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
                onView={() => setSelectedTenderId(tender.id)}
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