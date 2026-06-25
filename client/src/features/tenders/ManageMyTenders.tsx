import { useEffect, useMemo, useState } from 'react'
import Card from './Card'
import { apiCall, API_ENDPOINTS } from '../../config/api'

const AVAILABLE_DOMAINS = [
  'AI',
  'Security',
  'Healthcare',
  'Finance',
  'Logistics',
  'Design',
  'Data',
  'Web',
  'Mobile',
  'DevOps',
  'ML Ops',
  'Robotics',
]

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
  isClosed?: boolean
}

interface Props {
  currentUserCode: string
  tenders: Tender[]
  onUpdateTender: (updatedTender: Tender) => void
  onDeleteTender: (deletedTenderId: string) => void
}

export default function ManageMyTenders({ currentUserCode, tenders, onUpdateTender, onDeleteTender }: Props) {
  const publishedTenders = useMemo(
    () => tenders.filter((tender) => tender.publisherUserCode === currentUserCode && !tender.isClosed),
    [tenders, currentUserCode],
  )

  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null)
  const selectedTender = useMemo(
    () => publishedTenders.find((tender) => tender.id === selectedTenderId) ?? null,
    [publishedTenders, selectedTenderId],
  )
  const [draftTender, setDraftTender] = useState<Tender | null>(null)
  const [domainInput, setDomainInput] = useState('')
  const [showDomainSuggestions, setShowDomainSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false)

  useEffect(() => {
    setDraftTender(selectedTender)
    setDomainInput('')
    setShowCloseConfirmation(false)
  }, [selectedTender])

  const handleFieldChange = (field: keyof Tender, value: string) => {
    setDraftTender((prevTender) => {
      if (!prevTender) return prevTender
      if (field === 'domains') {
        return { ...prevTender, domains: value.split(',').map((domain) => domain.trim()).filter(Boolean) }
      }
      return { ...prevTender, [field]: value }
    })
  }

  const addDomain = (domain: string) => {
    setDraftTender((prevTender) => {
      if (!prevTender) return prevTender
      const currentDomains = prevTender.domains ?? []
      if (currentDomains.includes(domain) || currentDomains.length >= 7) return prevTender
      return { ...prevTender, domains: [...currentDomains, domain] }
    })
    setDomainInput('')
    setShowDomainSuggestions(false)
  }

  const removeDomain = (domain: string) => {
    setDraftTender((prevTender) => {
      if (!prevTender) return prevTender
      return { ...prevTender, domains: prevTender.domains?.filter((item) => item !== domain) ?? [] }
    })
  }

  const availableDomainOptions = useMemo(() => {
    const currentDomains = draftTender?.domains ?? []
    return AVAILABLE_DOMAINS.filter(
      (domain) => !currentDomains.includes(domain) && domain.toLowerCase().includes(domainInput.toLowerCase()),
    )
  }, [draftTender?.domains, domainInput])

  const saveTender = async () => {
    if (!draftTender || !draftTender.id) return

    setIsLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await apiCall<{ success: boolean; tender: Tender }>(
        API_ENDPOINTS.tenders.update(draftTender.id),
        {
          method: 'PUT',
          body: JSON.stringify(draftTender),
        },
      )

      if (response.success) {
        setSuccessMessage('המכרז עודכן בהצלחה')
        // Update the local state with the returned tender
        onUpdateTender(response.tender)
        // Clear selection after successful update
        setTimeout(() => {
          setSelectedTenderId(null)
          setSuccessMessage(null)
        }, 2000)
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'שגיאה בעדכון המכרז'
      setErrorMessage(errorMsg)
      console.error('Failed to update tender:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const closeTender = async () => {
    if (!selectedTender || !selectedTender.id) return

    setIsLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await apiCall<{ success: boolean }>(
        API_ENDPOINTS.tenders.delete(selectedTender.id),
        {
          method: 'DELETE',
        },
      )

      if (response.success) {
        setSuccessMessage('המכרז נמחק בהצלחה')
        onDeleteTender(selectedTender.id)
        setDraftTender(null)
        setTimeout(() => {
          setSelectedTenderId(null)
          setSuccessMessage(null)
        }, 2000)
      } else {
        throw new Error('Failed to delete tender')
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'שגיאה בסגירת המכרז'
      setErrorMessage(errorMsg)
      console.error('Failed to close tender:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="manage-shell">
      <div className="manage-header">
        <div>
          <h1>המכרזים שלי</h1>
          <p>הצג את כל המכרזים שפרסמת לפי משתמש: {localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!).name : "משתמש"}</p>
        </div>
        <div className="manage-summary">
          <strong>סה"כ מכרזים פעילים:</strong> {publishedTenders.length}
        </div>
      </div>

      <div className="manage-content">
        <div className="manage-list">
          {publishedTenders.length > 0 ? (
            publishedTenders.map((tender) => (
              <Card
                key={tender.id}
                id={tender.id}
                title={tender.title}
                shortDescription={tender.shortDescription}
                timeRequired={tender.timeRequired}
                budget={tender.budget}
                domains={tender.domains}
                applicantsCount={tender.applicants?.length ?? 0}
                onView={() => setSelectedTenderId(tender.id)}
              />
            ))
          ) : (
            <div className="empty-state">
              <h2>אין מכרזים פעילים</h2>
              <p>לא נמצאו מכרזים עם קוד משתמש זה. נסה להוסיף או לפרסם מכרז חדש.</p>
            </div>
          )}
        </div>

        <div className="manage-detail">
          {selectedTender && draftTender ? (
            <article className="detail-panel">
              <header className="detail-panel__header">
                <h2>עדכון פרטי המכרז</h2>
                <button type="button" className="tab-button" onClick={() => setSelectedTenderId(null)}>
                  סגור
                </button>
              </header>

              <div className="detail-field">
                <label htmlFor="tender-title">שם המכרז</label>
                <input
                  id="tender-title"
                  value={draftTender.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                />
              </div>

              <div className="detail-field">
                <label htmlFor="tender-shortDescription">תיאור קצר</label>
                <textarea
                  id="tender-shortDescription"
                  rows={3}
                  value={draftTender.shortDescription ?? ''}
                  onChange={(e) => handleFieldChange('shortDescription', e.target.value)}
                />
              </div>

              <div className="detail-row">
                <div className="detail-field">
                  <label htmlFor="tender-budget">תקציב</label>
                  <input
                    id="tender-budget"
                    value={draftTender.budget ?? ''}
                    onChange={(e) => handleFieldChange('budget', e.target.value)}
                  />
                </div>
                <div className="detail-field">
                  <label htmlFor="tender-timeRequired">זמן נדרש</label>
                  <input
                    id="tender-timeRequired"
                    value={draftTender.timeRequired ?? ''}
                    onChange={(e) => handleFieldChange('timeRequired', e.target.value)}
                  />
                </div>
              </div>

              <div className="detail-field">
                <label htmlFor="tender-domains">תחומים</label>
                <div
                  className="domains-select"
                  onFocus={() => setShowDomainSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDomainSuggestions(false), 150)}
                >
                  <div className="domain-tags">
                    {(draftTender.domains ?? []).map((domain) => (
                      <span key={domain} className="domain-pill domain-pill--editable">
                        {domain}
                        <button type="button" className="domain-remove" onClick={() => removeDomain(domain)}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    id="tender-domains"
                    aria-label="הוסף תחום"
                    value={domainInput}
                    onChange={(e) => {
                      setDomainInput(e.target.value)
                      setShowDomainSuggestions(true)
                    }}
                    placeholder="בחר תחום או הקלד"
                    className="domains-input"
                  />
                  {showDomainSuggestions && availableDomainOptions.length > 0 && (draftTender?.domains?.length ?? 0) < 7 ? (
                    <div className="domains-dropdown" role="listbox">
                      {availableDomainOptions.map((domain) => (
                        <button
                          type="button"
                          key={domain}
                          className="domains-option"
                          onMouseDown={() => addDomain(domain)}
                        >
                          {domain}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {draftTender?.domains && draftTender.domains.length >= 7 && (
                    <p className="field-help">מותר עד 7 תחומים בלבד.</p>
                  )}
                </div>
              </div>

              <div className="detail-field">
                <label>נדרשים סוכנים</label>
                <div className="agents-list">
                  {draftTender.agentsRequired && draftTender.agentsRequired.length > 0 ? (
                    draftTender.agentsRequired.map((agent) => (
                      <span key={agent} className="agent-pill">
                        {agent}
                      </span>
                    ))
                  ) : (
                    <p>לא צוינו סוכנים נדרשים</p>
                  )}
                </div>
              </div>

              <div className="detail-field">
                <label htmlFor="tender-additionalDetails">פרטים נוספים</label>
                <textarea
                  id="tender-additionalDetails"
                  rows={4}
                  value={draftTender.additionalDetails ?? ''}
                  onChange={(e) => handleFieldChange('additionalDetails', e.target.value)}
                />
              </div>

              <section className="applicants-section">
                <h3>מועמדים ({selectedTender.applicants?.length ?? 0})</h3>
                {selectedTender.applicants && selectedTender.applicants.length > 0 ? (
                  selectedTender.applicants.map((applicant, index) => (
                    <article key={`${applicant.email}-${index}`} className="applicant-card">
                      <h4>{applicant.name}</h4>
                      <p>
                        <strong>אימייל:</strong> {applicant.email}
                      </p>
                      <p>
                        <strong>פרטים:</strong> {applicant.details}
                      </p>
                      {applicant.proposal && (
                        <p>
                          <strong>הצעה:</strong> {applicant.proposal}
                        </p>
                      )}
                      {applicant.contactMethod && (
                        <p>
                          <strong>דרכי קשר:</strong> {applicant.contactMethod}</p>
                      )}
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>אין עדיין מועמדים שנרשמו למכרז זה.</p>
                  </div>
                )}
              </section>

              <div className="detail-actions">
                {errorMessage && (
                  <div className="error-message" style={{ color: 'red', marginBottom: '10px', padding: '8px', backgroundColor: '#ffe0e0', borderRadius: '4px' }}>
                    {errorMessage}
                  </div>
                )}
                {successMessage && (
                  <div className="success-message" style={{ color: 'green', marginBottom: '10px', padding: '8px', backgroundColor: '#e0ffe0', borderRadius: '4px' }}>
                    {successMessage}
                  </div>
                )}
                <button 
                  type="button" 
                  className="primary-button" 
                  onClick={saveTender}
                  disabled={isLoading}
                >
                  {isLoading ? 'שומר...' : 'שמור עדכון'}
                </button>
                {showCloseConfirmation && (
                  <div className="close-confirmation">
                    <p> האם אתה בטוח שברצונך לסגור את המכרז?</p>
                    <div className="close-confirmation__actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={closeTender}
                        disabled={isLoading}
                      >
                        {isLoading ? 'סוגר...' : 'כן, מחק מכרז'}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setShowCloseConfirmation(false)}
                        disabled={isLoading}
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}
                {!showCloseConfirmation && (
                  <button 
                    type="button" 
                    className="secondary-button" 
                    onClick={() => setShowCloseConfirmation(true)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'סוגר...' : 'סגירת המכרז'}
                  </button>
                )}
              </div>
            </article>
          ) : (
            <div className="manage-empty">
              <h2>בחר מכרז בכדי לראות פרטים ועדכון</h2>
              <p>לחץ על "פרטי מכרז" בכל כרטיס בכדי לראות את כל המידע והמועמדים.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
