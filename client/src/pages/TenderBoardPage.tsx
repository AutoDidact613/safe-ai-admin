import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  productType?: string
  aiApplicationType?: string
  isActive?: boolean
  agentsRequired?: string[]
  wantsEmails?: boolean
  additionalDetails?: string
  applicants?: Applicant[]
}

interface RawTender {
  id?: string
  _id?: string
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

const initialTenders: Tender[] = []

// פונקציית עזר לחילוץ מספר מתוך מחרוזת תקציב
const parseBudgetValue = (budgetStr: string | undefined): number => {
  if (!budgetStr) return 0;
  // הסרת פסיקים, סימני מטבע ומילים נפוצות
  const cleanStr = budgetStr.replace(/[$,₪,.\s]|ש"ח|דולר|שקל/g, '');
  const match = cleanStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

// פונקציית עזר להמרת מחרוזת זמן לימים (לצורך השוואה מספרית אחידה)
const parseTimeToDays = (timeStr: string | undefined): number => {
  if (!timeStr) return Infinity; // אם לא הוגדר זמן, לא נסנן אותו החוצה כברירת מחדל

  const cleanStr = timeStr.toLowerCase().trim();
  const numberMatch = cleanStr.match(/\d+/);
  const number = numberMatch ? parseInt(numberMatch[0], 10) : 1;

  if (cleanStr.includes('שנה') || cleanStr.includes('שנים') || cleanStr.includes('year')) {
    return number * 365;
  }
  if (cleanStr.includes('חודש') || cleanStr.includes('חודשים') || cleanStr.includes('month')) {
    return number * 30;
  }
  if (cleanStr.includes('שבוע') || cleanStr.includes('שבועות') || cleanStr.includes('week')) {
    return number * 7;
  }
  if (cleanStr.includes('יום') || cleanStr.includes('ימים') || cleanStr.includes('day')) {
    return number;
  }

  // אם יש רק מספר ללא יחידה, נתייחס אליו כאל ימים
  return numberMatch ? number : Infinity;
};

export default function TenderBoardPage() {
  const { t } = useTranslation()
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

  // State עבור חיפוש חכם עם AI
  const [isSmartSearchOpen, setIsSmartSearchOpen] = useState(false)
  const [smartSearchQuery, setSmartSearchQuery] = useState('')
  const [smartSearchResults, setSmartSearchResults] = useState<Tender[] | null>(null)
  const [isSmartSearching, setIsSmartSearching] = useState(false)

  const [selectedTender, setSelectedTender] = useState<Tender | null>(null)
  const [applyingTender, setApplyingTender] = useState<Tender | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'create' | 'manage'>('dashboard')
  const [currentUserCode, setCurrentUserCode] = useState('tnd-98234')

  const normalizeTender = (tender: RawTender): Tender => ({
    id: tender.id ?? tender._id ?? '',
    title: tender.title,
    publisherUserCode: tender.publisherUserCode,
    shortDescription: tender.shortDescription,
    timeRequired: tender.timeRequired,
    budget: tender.budget,
    productType: tender.productType,
    aiApplicationType: tender.aiApplicationType,
    isActive: tender.isActive ?? true,
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
        setErrorMessage(t('tenders.loadTendersFailedError'))
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadTenders()
    return () => {
      isMounted = false
    }
  }, [])

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
      setErrorMessage(t('tenders.smartSearchFailedError'))
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
        const tenderBudget = parseBudgetValue(t.budget)
        matchBudget = tenderBudget >= parsedMinBudget
      }

      // סינון לפי זמן מקסימלי (בימים)
      let matchTime = true
      if (maxTimeDays) {
        const parsedMaxTime = parseInt(maxTimeDays, 10) || Infinity
        const tenderTime = parseTimeToDays(t.timeRequired)
        matchTime = tenderTime <= parsedMaxTime
      }

      return matchProduct && matchAi && matchBudget && matchTime
    })
  }, [tenders, smartSearchResults, selectedProductType, selectedAiApplication, minBudget, maxTimeDays])

  const handleUpdateTender = (updatedTender: Tender) => {
    setTenders((prevTenders) => prevTenders.map((tender) => (tender.id === updatedTender.id ? updatedTender : tender)))
    if (smartSearchResults) {
      setSmartSearchResults((prev) => prev ? prev.map((tender) => (tender.id === updatedTender.id ? updatedTender : tender)) : null)
    }
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
      const updatedTender = await apiCall<{ tender?: { applicants?: Applicant[] } }>(
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
            }
            : tender,
        )

      setTenders((prev) => updateList(prev))
      if (smartSearchResults) {
        setSmartSearchResults((prev) => prev ? updateList(prev) : null)
      }
      setApplyingTender(null)
      setSuccessMessage(t('tenders.applicationSubmittedSuccessMsg'))
    } catch (error) {
      console.error('Failed to submit application', error)
      setErrorMessage(t('tenders.applicationFailedError'))
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
          <div className="loading-banner">{t('tenders.loadingTendersFromServer')}</div>
        )}
        <section className="dashboard-hero">
          <div>
            <h1>{t('nav.tenderBoard')}</h1>
            <p className="lead-copy">
              {t('tenders.dashboardLeadCopy')}
            </p>
          </div>
          <div className="dashboard-actions">
            <div style={{ minWidth: 10 }} />
          </div>
        </section>

        {isSmartSearching && (
          <div className="loading-banner">{t('tenders.smartSearchingBanner')}</div>
        )}
        {errorMessage && (
          <div className="error-banner">{errorMessage}</div>
        )}


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
              <span>{t('tenders.smartSearchToggleBtn')}</span>
            </button>

            {isSmartSearchOpen && (
              <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
                <input
                  type="text"
                  value={smartSearchQuery}
                  onChange={(e) => setSmartSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSmartSearch() }}
                  placeholder={t('tenders.smartSearchInputPlaceholder')}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, maxWidth: '400px' }}
                />
                <button type="button" className="tab-button" onClick={handleSmartSearch} style={{ backgroundColor: '#f1f5f9' }}>
                  {t('tenders.searchBtn')}
                </button>
                {smartSearchResults !== null && (
                  <button type="button" className="tab-button" onClick={handleClearSmartSearch}>
                    {t('tenders.showAllBtn')}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="filters-row" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'center', width: '100%' }}>

            {/* תיבה 1: סוג מוצר */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong>{t('tenders.productTypeFilterLabel')}</strong>
              <div className="autocomplete">
                <input
                  aria-label={t('tenders.searchProductTypeAriaLabel')}
                  value={productTypeInput}
                  onChange={(e) => {
                    setProductTypeInput(e.target.value)
                    setShowProductSuggestions(true)
                  }}
                  onFocus={() => setShowProductSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowProductSuggestions(false), 150)}
                  placeholder={t('tenders.typeToSearchOrSelectPlaceholder')}
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
                        {t(`tenders.productTypeOptions.${p}`, { defaultValue: p })}
                      </div>
                    ))}
                    {productTypes.filter((p) => p.toLowerCase().includes(productTypeInput.toLowerCase() || '')).length === 0 && (
                      <div className="autocomplete-empty" style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{t('tenders.noResultsFoundText')}</div>
                    )}
                  </div>
                )}
              </div>
              {selectedProductType && (
                <button type="button" className="tab-button" onClick={() => chooseProductType(null)}>
                  {t('tenders.clearBtn')}
                </button>
              )}
            </div>

            {/* תיבה 2: צורת יישום AI */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong>{t('tenders.aiApplicationFilterLabel')}</strong>
              <div className="autocomplete">
                <input
                  aria-label={t('tenders.searchAiApplicationAriaLabel')}
                  value={aiApplicationInput}
                  onChange={(e) => {
                    setAiApplicationInput(e.target.value)
                    setShowAiSuggestions(true)
                  }}
                  onFocus={() => setShowAiSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowAiSuggestions(false), 150)}
                  placeholder={t('tenders.typeToSearchOrSelectPlaceholder')}
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
                        {t(`tenders.aiApplicationOptions.${a}`, { defaultValue: a })}
                      </div>
                    ))}
                    {aiApplications.filter((a) => a.toLowerCase().includes(aiApplicationInput.toLowerCase() || '')).length === 0 && (
                      <div className="autocomplete-empty" style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{t('tenders.noResultsFoundText')}</div>
                    )}
                  </div>
                )}
              </div>
              {selectedAiApplication && (
                <button type="button" className="tab-button" onClick={() => chooseAiApplication(null)}>
                  {t('tenders.clearBtn')}
                </button>
              )}
            </div>

            {/* תיבה 3: חיפוש לפי תקציב מינימלי */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong>{t('tenders.minBudgetFilterLabel')}</strong>
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
                placeholder={t('tenders.budgetExamplePlaceholder')}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '140px' }}
              />
            </div>

            {/* תיבה 4: חיפוש לפי זמן מקסימלי (בימים) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong>{t('tenders.maxTimeFilterLabel')}</strong>
              <input
                type="number"
                value={maxTimeDays}
                onChange={(e) => setMaxTimeDays(e.target.value)}
                placeholder={t('tenders.timeExamplePlaceholder')}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '140px' }}
              />
            </div>

          </div>
        </section>

        <section className="dashboard-metrics">
          <div className="metric-card">
            <strong>{visibleTenders.length}</strong>
            <p>{t('tenders.totalTendersFoundLabel')}</p>
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
                applicantsCount={tender.applicants?.length ?? 0}
                onView={() => setSelectedTender(tender)}
              />
            ))
          ) : (
            <div className="empty-state" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px' }}>
              <h2>{t('tenders.noMatchingTendersTitle')}</h2>
              <p>{t('tenders.noMatchingTendersMessage')}</p>
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
        <nav className="dashboard-page-nav" aria-label={t('tenders.pageNavAriaLabel')}>
          <button
            type="button"
            className={`dashboard-link ${activeScreen === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveScreen('dashboard')}
          >
            {t('tenders.tendersBoardTab')}
          </button>
          <button
            type="button"
            className={`dashboard-link ${activeScreen === 'create' ? 'active' : ''}`}
            onClick={() => setActiveScreen('create')}
          >
            {t('tenders.publishProjectTab')}
          </button>
          <button
            type="button"
            className={`dashboard-link ${activeScreen === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveScreen('manage')}
          >
            {t('tenders.viewMyTendersTab')}
          </button>
        </nav>
      </section>

      {renderScreen()}
    </main>
  )
}