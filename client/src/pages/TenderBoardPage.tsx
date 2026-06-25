import { useEffect, useMemo, useState } from 'react'
import { apiCall, API_ENDPOINTS } from '../config/api'
import Card from '../features/tenders/Card.tsx'
import TenderDetails from '../features/tenders/TenderDetails.tsx'
import ApplyForTender from './../features/tenders/ApplyForTender.tsx'
import CreateTender from '../features/tenders/CreateTender.tsx'
import ManageMyTenders from '../features/tenders/ManageMyTenders.tsx'
import '../styles/tender-board-page.css'

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

const initialTenders: Tender[] = []


export default function TenderBoardPage() {
  const [tenders, setTenders] = useState<Tender[]>(initialTenders)
  // הוספת ה-State לתחומים במקום המשתנה הסטטי הריק
  const [allDomains, setAllDomains] = useState<string[]>([])
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [domainInput, setDomainInput] = useState('')
  const [showDomainSuggestions, setShowDomainSuggestions] = useState(false)
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null)
  const [applyingTender, setApplyingTender] = useState<Tender | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'create' | 'manage'>('dashboard')
  const [currentUserCode, setCurrentUserCode] = useState('tnd-98234')

  const normalizeTender = (tender: any): Tender => ({
    id: tender.id ?? tender._id ?? '',
    title: tender.title,
    publisherUserCode: tender.publisherUserCode,
    shortDescription: tender.shortDescription,
    timeRequired: tender.timeRequired,
    budget: tender.budget,
    domains: tender.domains,
    agentsRequired: tender.agentsRequired,
    wantsEmails: tender.wantsEmails,
    additionalDetails: tender.additionalDetails,
    applicants: tender.applicants,
  })

  useEffect(() => {
    let isMounted = true

    const userString = localStorage.getItem('user');
    const userId = userString ? JSON.parse(userString)._id : '000';
    setCurrentUserCode(userId);    

    async function loadTenders() {
      try {
        setLoading(true)
        setErrorMessage('')
        
        apiCall<string[]>(API_ENDPOINTS.tenders.getFields)
          .then((fields) => {
            if (isMounted && fields) setAllDomains(fields);
          })
          .catch((err) => console.error('Failed to load domains', err));

        const serverTenders = await apiCall<any[]>(API_ENDPOINTS.tenders.list)

        if (!isMounted) return

        if (serverTenders.length > 0) {
          setTenders(serverTenders.map(normalizeTender))
          return
        }

        await Promise.all(
          initialTenders.map((tender) =>
            apiCall(API_ENDPOINTS.tenders.create, {
              method: 'POST',
              body: JSON.stringify(tender),
            }),
          ),
        )

        const createdTenders = await apiCall<any[]>(API_ENDPOINTS.tenders.list)
        if (!isMounted) return
        setTenders(createdTenders.map(normalizeTender))
      } catch (error) {
        console.error('Failed to load or upload tenders', error)
        if (!isMounted) return
        setErrorMessage('לא ניתן לטעון את המכרזים כעת. אנא נסה שוב מאוחר יותר.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadTenders()
    return () => {
      isMounted = false
    }
  }, [])

  const filteredByDomain = useMemo(() => {
    if (!selectedDomain) return tenders
    return tenders.filter((t) => t.domains && t.domains.includes(selectedDomain))
  }, [tenders, selectedDomain])

  const visibleTenders = filteredByDomain

  const handleUpdateTender = (updatedTender: Tender) => {
    setTenders((prevTenders) => prevTenders.map((tender) => (tender.id === updatedTender.id ? updatedTender : tender)))
  }

  const handleDeleteTender = (deletedTenderId: string) => {
    setTenders((prevTenders) => prevTenders.filter((tender) => tender.id !== deletedTenderId))
  }

  const chooseDomain = (domain: string | null) => {
    setSelectedDomain(domain)
    setDomainInput(domain ?? '')
    setShowDomainSuggestions(false)
  }

  const startApply = (id: string) => {
    const tender = tenders.find((t) => t.id === id)
    if (tender) {
      setSelectedTender(null)
      setApplyingTender(tender)
      setSuccessMessage('')
    }
  }

  const handleTenderApply = async (applicant: Applicant) => {
    if (!applyingTender) return

    const applicantWithId = {
      ...applicant,
    }

    try {
      const updatedTender = await apiCall<any>(
        API_ENDPOINTS.tenders.apply(applyingTender.id),
        {
          method: 'POST',
          body: JSON.stringify(applicantWithId),
        },
      )

      setTenders((prevTenders) =>
        prevTenders.map((tender) =>
          tender.id === applyingTender.id
            ? {
                ...tender,
                applicants: updatedTender.tender?.applicants ?? [...(tender.applicants ?? []), applicantWithId],
              }
            : tender,
        ),
      )
      setApplyingTender(null)
      setSuccessMessage('הגשת מועמדות בוצעה בהצלחה')
    } catch (error) {
      console.error('Failed to submit application', error)
      setErrorMessage('הגישה למכרז נכשלה. בדוק את הנתונים ונסה שוב.')
    }
  }

  const renderScreen = () => {
    if (activeScreen === 'create') {
      return <CreateTender onSuccess={() => setActiveScreen('dashboard')} />   
    }
    if (activeScreen === 'manage') {
      return (
        <ManageMyTenders
          currentUserCode={currentUserCode}
          tenders={tenders}
          onUpdateTender={handleUpdateTender}
          onDeleteTender={handleDeleteTender}
        />
      )
    }

    return (
      <main className="tender-board-page">
        {loading && (
          <div className="loading-banner">טוען מכרזים מהשרת...</div>
        )}
        {errorMessage && (
          <div className="error-banner">{errorMessage}</div>
        )}
        <section className="dashboard-hero">
          <div>
            <h1>לוח פרוייקטים</h1>
            <p className="lead-copy">
              כאן תוכל למצוא את כל הפרוייקטים הזמינים, להגיש מועמדות לפרוייקטים שמעניינים אותך, ולנהל את הפרוייקטים שפרסמת בעצמך.
            </p>
          </div>
          <div className="dashboard-actions">
            <div style={{ minWidth: 10 }} />
          </div>
        </section>

        <section className="filters-section">
          <div className="filters-row">
            <strong>חפש לפי תחום:</strong>
            <div className="autocomplete">
              <input
                aria-label="חיפוש תחום"
                value={domainInput}
                onChange={(e) => {
                  setDomainInput(e.target.value)
                  setShowDomainSuggestions(true)
                }}
                onFocus={() => setShowDomainSuggestions(true)}
                onBlur={() => setTimeout(() => setShowDomainSuggestions(false), 150)}
                placeholder="הקלד לחיפוש או בחר"
                className="autocomplete-input"
              />

              {showDomainSuggestions && (
                <div role="listbox" className="autocomplete-list">
                  {allDomains.filter((d) => d.toLowerCase().includes(domainInput.toLowerCase() || '')).map((d) => (
                    <div
                      key={d}
                      role="option"
                      tabIndex={0}
                      onMouseDown={() => chooseDomain(d)}
                      className="autocomplete-item"
                    >
                      {d}
                    </div>
                  ))}
                  {allDomains.filter((d) => d.toLowerCase().includes(domainInput.toLowerCase() || '')).length === 0 && (
                    <div className="autocomplete-empty">לא נמצאו תחומים</div>
                  )}
                </div>
              )}
            </div>

            {selectedDomain && (
              <button type="button" className="tab-button" onClick={() => chooseDomain(null)}>
                נקה
              </button>
            )}
          </div>
        </section>

        <section className="dashboard-metrics">
          <div className="metric-card">
            <p>סה"כ מכרזים</p>
            <strong>{tenders.length}</strong>
          </div>
        </section>

        <section className="dashboard-grid">
          {visibleTenders.length > 0 ? (
            visibleTenders.map((tender) => (
              <Card
                key={tender.id}
                id={tender.id}
                title={tender.title}
                shortDescription={tender.shortDescription}
                timeRequired={tender.timeRequired}
                budget={tender.budget}
                domains={tender.domains}
                applicantsCount={tender.applicants?.length ?? 0}
                onView={() => setSelectedTender(tender)}
              />
            ))
          ) : (
            <div className="empty-state">
              <h2>אין מכרזים מתאימים</h2>
              <p>נסו לשנות את סינון התחומים או לבדוק את כל המכרזים.</p>
            </div>
          )}
        </section>

        {successMessage && <div className="success-banner">{successMessage}</div>}

        {applyingTender ? (
          <ApplyForTender tender={applyingTender} onSubmit={handleTenderApply} onCancel={() => setApplyingTender(null)} />
        ) : (
          selectedTender && <TenderDetails tender={selectedTender} onClose={() => setSelectedTender(null)} onApply={startApply} />
        )}
      </main>
    )
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-page-header">
        <nav className="dashboard-page-nav" aria-label="ניווט דף">
          <button
            type="button"
            className={`dashboard-link ${activeScreen === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveScreen('dashboard')}
          >
            לוח מכרזים
          </button>
          <button
            type="button"
            className={`dashboard-link ${activeScreen === 'create' ? 'active' : ''}`}
            onClick={() => setActiveScreen('create')}
          >
            פרסום פרוייקט
          </button>
          <button
            type="button"
            className={`dashboard-link ${activeScreen === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveScreen('manage')}
          >
            צפיה במכרזים שלי
          </button>
        </nav>
      </section>

      {renderScreen()}
    </main>
  )
}