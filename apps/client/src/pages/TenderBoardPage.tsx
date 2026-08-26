import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiCall, API_ENDPOINTS } from '../config/api'
import Card from '../features/tenders/Card.tsx'
import TenderDetails from '../features/tenders/TenderDetails.tsx'
import ApplyForTender from './../features/tenders/ApplyForTender.tsx'
import ViewMyApplication from '../features/tenders/ViewMyApplication.tsx'
import CreateTender from '../features/tenders/CreateTender.tsx'
import ManageMyTenders from '../features/tenders/ManageMyTenders.tsx'
import type { Applicant, RawTender, Tender, TenderTime } from '../features/tenders/types'
import '../styles/tender-board-page.css'
import AiThinkingLoader from '../features/tenders/AiThinkingLoader.tsx'

const initialTenders: Tender[] = []

// Budget is now stored as a number; no string parsing helper required

// המרה של זמן מובנה לימים — מקבל רק מבנה `TenderTime`
const parseTimeToDays = (time?: TenderTime): number => {
  if (!time) return Infinity
  const { value = 0, unit } = time
  switch (unit) {
    case 'שנים':
      return value * 365
    case 'חודשים':
      return value * 30
    case 'שבועות':
      return value * 7
    case 'ימים':
      return value
    case 'שעות':
      return value / 24
    default:
      return Infinity
  }
}

export default function TenderBoardPage() {
  const [tenders, setTenders] = useState<Tender[]>(initialTenders)

  // State עבור סינון לפי סוג מוצר
  const [productTypes, setProductTypes] = useState<string[]>([])
  const [selectedProductType, setSelectedProductType] = useState<string | null>(null)
  const [productTypeInput, setProductTypeInput] = useState('')
  const [showProductSuggestions, setShowProductSuggestions] = useState(false)

  // State עבור סינון לפי צורת יישום AI
  const [aiApplications, setAiApplications] = useState<string[]>([])
  const [selectedAiApplication, setSelectedAiApplication] = useState<string | null>(null)
  const [aiApplicationInput, setAiApplicationInput] = useState('')
  const [showAiSuggestions, setShowAiSuggestions] = useState(false)

  // State חדש עבור סינון תקציב וזמן
  const [minBudget, setMinBudget] = useState<string>('')
  const [maxTimeDays, setMaxTimeDays] = useState<string>('')

  // State עבור סינון "מכרזים שהגשתי להם הצעה"
  const [showOnlyApplied, setShowOnlyApplied] = useState(false)

  // State עבור חיפוש חכם עם AI
  const [isSmartSearchOpen, setIsSmartSearchOpen] = useState(false)
  const [smartSearchQuery, setSmartSearchQuery] = useState('')
  const [smartSearchResults, setSmartSearchResults] = useState<Tender[] | null>(null)
  const [isSmartSearching, setIsSmartSearching] = useState(false)

  const [selectedTender, setSelectedTender] = useState<Tender | null>(null)
  const [applyingTender, setApplyingTender] = useState<Tender | null>(null)
  const [viewingApplication, setViewingApplication] = useState<Applicant | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'create' | 'manage'>('dashboard')
  const [currentUserCode, setCurrentUserCode] = useState('tnd-98234')
  const [refreshKey, setRefreshKey] = useState(0)

  // פתיחה ישירה של הצעה ספציפית מקישור שהגיע במייל (screen=manage&tenderId=&applicantId=)
  const [searchParams, setSearchParams] = useSearchParams()
  const [deepLinkTenderId, setDeepLinkTenderId] = useState<string | null>(null)
  const [deepLinkApplicantId, setDeepLinkApplicantId] = useState<string | null>(null)

  useEffect(() => {
    const screen = searchParams.get('screen')
    const tenderId = searchParams.get('tenderId')
    if (screen === 'manage' && tenderId) {
      setActiveScreen('manage')
      setDeepLinkTenderId(tenderId)
      setDeepLinkApplicantId(searchParams.get('applicantId'))
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!successMessage) return undefined

    setShowSuccessOverlay(true)
    const timer = window.setTimeout(() => {
      setSuccessMessage('')
      setShowSuccessOverlay(false)
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [successMessage])

  const normalizeTender = (tender: RawTender): Tender => ({
    id: tender.id ?? tender._id ?? '',
    title: tender.title,
    publisherUserCode: tender.publisherUserCode,
    shortDescription: tender.shortDescription,
    timeRequired: tender.timeRequired,
    budget: typeof tender.budget === 'number' ? tender.budget : 0,
    productType: tender.productType,
    aiApplicationType: tender.aiApplicationType,
    isActive: tender.isActive ?? true,
    agentsRequired: tender.agentsRequired,
    wantsEmails: tender.wantsEmails,
    additionalDetails: tender.additionalDetails,
    applicants: tender.applicants,
    applicantsCount: tender.applicantsCount,
    proposalRange: tender.proposalRange,
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

        // טעינת סוגי המוצרים
        apiCall<string[]>(API_ENDPOINTS.tenders.getProductTypes)
          .then((types) => {
            if (isMounted && types) setProductTypes(types);
          })
          .catch((err) => console.error('Failed to load product types', err));

        // טעינת צורות יישום ה-AI
        apiCall<string[]>(API_ENDPOINTS.tenders.getAIApplicationTypes)
          .then((apps) => {
            if (isMounted && apps) setAiApplications(apps);
          })
          .catch((err) => console.error('Failed to load AI application types', err));

        const serverTenders = await apiCall<RawTender[]>(API_ENDPOINTS.tenders.list)

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

        const createdTenders = await apiCall<RawTender[]>(API_ENDPOINTS.tenders.list)
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
  }, [refreshKey])

  // פונקציה לביצוע חיפוש חכם מול השרת
  const handleSmartSearch = async () => {
    if (!smartSearchQuery.trim()) return
    try {
      setIsSmartSearching(true)
      setErrorMessage('')
      // קריאה לשרת עם ה-Query Parameter q כמבוקש
      const endpoint = `${API_ENDPOINTS.tenders.smartSearch}?q=${encodeURIComponent(smartSearchQuery)}`
      const results = await apiCall<RawTender[]>(endpoint)
      setSmartSearchResults(results.map(normalizeTender))
      console.log(results.map(normalizeTender))
    } catch (error) {
      console.error('Failed to execute smart search', error)
      setErrorMessage('החיפוש החכם נכשל. אנא נסה שנית.')
    } finally {
      setIsSmartSearching(false)
    }
  }

  // ניקוי החיפוש החכם וחזרה לרשימה המלאה
  const handleClearSmartSearch = () => {
    setSmartSearchQuery('')
    setSmartSearchResults(null)
  }

  // סינון משולב לפי סוג מוצר, יישום AI, סטטוס פעיל, תקציב, זמן וחיפוש חכם
  const visibleTenders = useMemo(() => {
    // אם יש תוצאות מחיפוש חכם, נסנן אותן. אחרת, נסנן את כל המכרזים
    const baseTenders = smartSearchResults !== null ? smartSearchResults : tenders

    return baseTenders.filter((t) => {
      if (t.isActive === false) return false

      const matchProduct = !selectedProductType || t.productType === selectedProductType
      const matchAi = !selectedAiApplication || t.aiApplicationType === selectedAiApplication

      // סינון לפי תקציב מינימלי
      let matchBudget = true
      if (minBudget) {
        const parsedMinBudget = parseInt(minBudget, 10) || 0
        const tenderBudget = (t.budget ?? 0)
        matchBudget = tenderBudget >= parsedMinBudget
      }

      // סינון לפי זמן מקסימלי (בימים)
      let matchTime = true
      if (maxTimeDays) {
        const parsedMaxTime = parseInt(maxTimeDays, 10) || Infinity
        const tenderTime = parseTimeToDays(t.timeRequired)
        matchTime = tenderTime <= parsedMaxTime
      }

      // סינון לפי מכרזים שהמשתמש הגיש להם הצעה
      const matchApplied = !showOnlyApplied || (t.applicants ?? []).some((a) => a.userId === currentUserCode)

      return matchProduct && matchAi && matchBudget && matchTime && matchApplied
    })
  }, [tenders, smartSearchResults, selectedProductType, selectedAiApplication, minBudget, maxTimeDays, showOnlyApplied, currentUserCode])

  const handleUpdateTender = (updatedTender: Tender) => {
    setTenders((prevTenders) => prevTenders.map((tender) => (tender.id === updatedTender.id ? updatedTender : tender)))
    if (smartSearchResults) {
      setSmartSearchResults((prev) => prev ? prev.map((tender) => (tender.id === updatedTender.id ? updatedTender : tender)) : null)
    }
    setRefreshKey((k) => k + 1)
  }

  const handleDeleteTender = (deletedTenderId: string) => {
    setTenders((prevTenders) => prevTenders.filter((tender) => tender.id !== deletedTenderId))
    if (smartSearchResults) {
      setSmartSearchResults((prev) => prev ? prev.filter((tender) => tender.id !== deletedTenderId) : null)
    }
  }

  const chooseProductType = (type: string | null) => {
    setSelectedProductType(type)
    setProductTypeInput(type ?? '')
    setShowProductSuggestions(false)
  }

  const chooseAiApplication = (app: string | null) => {
    setSelectedAiApplication(app)
    setAiApplicationInput(app ?? '')
    setShowAiSuggestions(false)
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

    const applicantWithId = { ...applicant }

    try {
      const updatedTender = await apiCall<{
        tender?: Pick<Tender, 'applicants' | 'applicantsCount' | 'proposalRange'>
      }>(
        API_ENDPOINTS.tenders.apply(applyingTender.id),
        {
          method: 'POST',
          body: JSON.stringify(applicantWithId),
        },
      )

      const updateList = (prevTenders: Tender[]) =>
        prevTenders.map((tender) =>
          tender.id === applyingTender.id
            ? {
              ...tender,
              applicants: updatedTender.tender?.applicants ?? [...(tender.applicants ?? []), applicantWithId],
              applicantsCount: updatedTender.tender?.applicantsCount ?? (tender.applicantsCount ?? tender.applicants?.length ?? 0) + 1,
              proposalRange: updatedTender.tender?.proposalRange ?? tender.proposalRange,
            }
            : tender,
        )

      setTenders((prev) => updateList(prev))
      if (smartSearchResults) {
        setSmartSearchResults((prev) => prev ? updateList(prev) : null)
      }
      setApplyingTender(null)
      setSuccessMessage('הגשת מועמדות בוצעה בהצלחה')
    } catch (error) {
      console.error('Failed to submit application', error)
      setErrorMessage('הגישה למכרז נכשלה. בדוק את הנתונים ונסה שוב.')
    }
  }

  const renderScreen = () => {
    if (activeScreen === 'create') {
      return <CreateTender onSuccess={() => { setRefreshKey((k) => k + 1); setActiveScreen('dashboard') }} />
    }
    if (activeScreen === 'manage') {
      return (
        <ManageMyTenders
          currentUserCode={currentUserCode}
          tenders={tenders}
          onUpdateTender={handleUpdateTender}
          onDeleteTender={handleDeleteTender}
          initialOffersTenderId={deepLinkTenderId}
          initialHighlightApplicantId={deepLinkApplicantId}
        />
      )
    }

    return (
      <main className="tender-board-page">
        {loading && (
          <div className="loading-banner">טוען מכרזים מהשרת...</div>
        )}
        <section className="dashboard-hero">
          <div>
            <h1>לוח פרוייקטים</h1>
            <p className="lead-copy">
              כאן תוכל לעיין בפרויקטים, להגיש מועמדות ולנהל את הפרויקטים שלך.
            </p>
          </div>
          <div className="dashboard-actions">
            <div style={{ minWidth: 10 }} />
          </div>
        </section>

        {/* חלק הסינונים המעודכן - כולל חיפוש חכם עם AI, סוג מוצר, יישום AI, תקציב וזמן */}
        <section className="filters-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>

          {/* תיבת חיפוש חכם עם AI */}
          <div className="smart-search-container" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="tab-button"
              onClick={() => setIsSmartSearchOpen(!isSmartSearchOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              <span>✨</span>
              {isSmartSearchOpen ? <span>סגור חיפוש חכם</span> : <span>חיפוש חכם</span>}
            </button>

            {!isSmartSearchOpen && (
              <button
                type="button"
                className={`applied-filter-toggle${showOnlyApplied ? ' active' : ''}`}
                onClick={() => setShowOnlyApplied((v) => !v)}
                aria-pressed={showOnlyApplied}
              >
                {showOnlyApplied ? 'ניקוי החיפוש' : 'מכרזים שהגשתי להם הצעה'}
              </button>
            )}

            {isSmartSearchOpen && (
              <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
                <input
                  type="text"
                  value={smartSearchQuery}
                  onChange={(e) => setSmartSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSmartSearch() }}
                  placeholder='הקלד חיפוש חופשי'
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, maxWidth: '400px' }}
                />
                <button type="button" className="tab-button" onClick={handleSmartSearch} style={{ backgroundColor: '#f1f5f9' }}>
                  חפש
                </button>
                {smartSearchResults !== null && (
                  <button type="button" className="tab-button" onClick={handleClearSmartSearch}>
                    ניקוי
                  </button>
                )}
              </div>
            )}

            {isSmartSearchOpen && (
              <button
                type="button"
                className={`applied-filter-toggle${showOnlyApplied ? ' active' : ''}`}
                onClick={() => setShowOnlyApplied((v) => !v)}
                aria-pressed={showOnlyApplied}
              >
                {showOnlyApplied ? 'ניקוי החיפוש' : 'מכרזים שהגשתי להם הצעה'}
              </button>
            )}
          </div>

          {isSmartSearching && (
            <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
              <AiThinkingLoader color="#16a34a" />
            </div>
          )}
          {errorMessage && (
            <div className="error-banner">{errorMessage}</div>
          )}

          {!isSmartSearchOpen && <div className="filters-row" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'center', width: '100%' }}>

            {/* תיבה 1: סוג מוצר */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong>סוג המוצר:</strong>
              <div className="autocomplete">
                <input
                  aria-label="חיפוש סוג מוצר"
                  value={productTypeInput}
                  onChange={(e) => {
                    setProductTypeInput(e.target.value)
                    setShowProductSuggestions(true)
                  }}
                  onFocus={() => setShowProductSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowProductSuggestions(false), 150)}
                  placeholder="הקלד או בחר"
                  className="autocomplete-input"
                />

                {showProductSuggestions && (
                  <div role="listbox" className="autocomplete-list">
                    {productTypes.filter((p) => p.toLowerCase().includes(productTypeInput.toLowerCase() || '')).map((p) => (
                      <div
                        key={p}
                        role="option"
                        tabIndex={0}
                        onMouseDown={() => chooseProductType(p)}
                        className="autocomplete-item"
                      >
                        {p}
                      </div>
                    ))}
                    {productTypes.filter((p) => p.toLowerCase().includes(productTypeInput.toLowerCase() || '')).length === 0 && (
                      <div className="autocomplete-empty" style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>לא נמצאו תוצאות</div>
                    )}
                  </div>
                )}
              </div>
              {selectedProductType && (
                <button type="button" className="tab-button" onClick={() => chooseProductType(null)}>
                  נקה
                </button>
              )}
            </div>

            {/* תיבה 2: צורת יישום AI */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong>יישום AI:</strong>
              <div className="autocomplete">
                <input
                  aria-label="חיפוש צורת יישום AI"
                  value={aiApplicationInput}
                  onChange={(e) => {
                    setAiApplicationInput(e.target.value)
                    setShowAiSuggestions(true)
                  }}
                  onFocus={() => setShowAiSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowAiSuggestions(false), 150)}
                  placeholder="הקלד או בחר"
                  className="autocomplete-input"
                />

                {showAiSuggestions && (
                  <div role="listbox" className="autocomplete-list">
                    {aiApplications.filter((a) => a.toLowerCase().includes(aiApplicationInput.toLowerCase() || '')).map((a) => (
                      <div
                        key={a}
                        role="option"
                        tabIndex={0}
                        onMouseDown={() => chooseAiApplication(a)}
                        className="autocomplete-item"
                      >
                        {a}
                      </div>
                    ))}
                    {aiApplications.filter((a) => a.toLowerCase().includes(aiApplicationInput.toLowerCase() || '')).length === 0 && (
                      <div className="autocomplete-empty" style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>לא נמצאו תוצאות</div>
                    )}
                  </div>
                )}
              </div>
              {selectedAiApplication && (
                <button type="button" className="tab-button" onClick={() => chooseAiApplication(null)}>
                  נקה
                </button>
              )}
            </div>

            {/* תיבה 3: חיפוש לפי תקציב מינימלי */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong>תקציב מינימלי:</strong>
              <input
                type="number"
                min="0" // חוסם את החצים של האינפוט מלרדת מתחת ל-0
                value={minBudget}
                onChange={(e) => {
                  const val = e.target.value;
                  // אם המשתמש הקליד מספר שלילי, נהפוך אותו ל-0 או לריק
                  if (parseInt(val, 10) < 0) {
                    setMinBudget('0');
                  } else {
                    setMinBudget(val);
                  }
                }}
                placeholder="לדוגמה: 5000"
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '140px' }}
              />
            </div>

            {/* תיבה 4: חיפוש לפי זמן מקסימלי (בימים) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong>זמן מקסימלי (בימים):</strong>
              <input
                type="number"
                value={maxTimeDays}
                onChange={(e) => setMaxTimeDays(e.target.value)}
                placeholder="לדוגמה: 30"
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '140px' }}
              />
            </div>

          </div>}
        </section>

        <section className="dashboard-metrics">
          <div className="metric-card">
            <strong>{visibleTenders.length}</strong>
            <p>סה"כ מכרזים נמצאו:</p>
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
                productType={tender.productType}
                aiApplicationType={tender.aiApplicationType}
                applicantsCount={tender.applicantsCount ?? tender.applicants?.length ?? 0}
                appliedAt={tender.applicants?.find((a) => a.userId === currentUserCode)?.appliedAt}
                onView={() => setSelectedTender(tender)}
              />
            ))
          ) : (
            <div className="empty-state" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px' }}>
              <h2>אין מכרזים מתאימים</h2>
              <p>נסו לשנות את סינון הפרמטרים או לבדוק את כל המכרזים.</p>
            </div>
          )}
        </section>

        {applyingTender ? (
          <ApplyForTender tender={applyingTender} onSubmit={handleTenderApply} onCancel={() => setApplyingTender(null)} />
        ) : viewingApplication && selectedTender ? (
          <ViewMyApplication tender={selectedTender} applicant={viewingApplication} onClose={() => setViewingApplication(null)} />
        ) : (
          selectedTender && (
            <TenderDetails
              tender={selectedTender}
              onClose={() => setSelectedTender(null)}
              onApply={startApply}
              currentUserId={currentUserCode}
              onViewMyApplication={(applicant) => setViewingApplication(applicant)}
            />
          )
        )}

        {showSuccessOverlay && successMessage && (
          <div className="success-modal-overlay" role="alert" aria-live="assertive">
            <div className="success-modal">
              <div className="success-modal__icon">✅</div>
              <div className="success-modal__text">{successMessage}</div>
            </div>
          </div>
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
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            לוח מכרזים
          </button>
          <button
            type="button"
            className={`dashboard-link ${activeScreen === 'create' ? 'active' : ''}`}
            onClick={() => setActiveScreen('create')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            פרסום פרוייקט
          </button>
          <button
            type="button"
            className={`dashboard-link ${activeScreen === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveScreen('manage')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            צפיה במכרזים שלי
          </button>
        </nav>
      </section>

      {renderScreen()}
    </main>
  )
}