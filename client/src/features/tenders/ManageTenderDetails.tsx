import { useEffect, useState } from 'react'
import { apiCall, API_ENDPOINTS } from '../../config/api'
import type { Tender, TenderTime } from './types'

interface ManageTenderDetailsProps {
  tender: Tender
  onClose: () => void
  onUpdateTender: (updatedTender: Tender) => void
  onDeleteTender: (deletedTenderId: string) => void
}

export default function ManageTenderDetails({
  tender,
  onClose,
  onUpdateTender,
  onDeleteTender,
}: ManageTenderDetailsProps) {
  // שמירת מצב הטופס בהתאם למבנה הנתונים הקים במכרז
  const [draftTender, setDraftTender] = useState<Tender>({ ...tender })
  const [agents, setAgents] = useState<string[]>(tender.agentsRequired ?? ['', ''])
  
  const [productTypeOptions, setProductTypeOptions] = useState<string[]>([])
  const [aiApplicationOptions, setAiApplicationOptions] = useState<string[]>([])
  
  const timeUnits = ['שעות','ימים','שבועות','חודשים','שנים'] as const
  
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false)

  // 1. טעינת הרשימות הסגורות מה-API
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        apiCall<string[]>(API_ENDPOINTS.tenders.getProductTypes)
          .then((types) => types && setProductTypeOptions(types))
          .catch((err) => console.error('Failed to load product types', err))

        apiCall<string[]>(API_ENDPOINTS.tenders.getAIApplicationTypes)
          .then((apps) => apps && setAiApplicationOptions(apps))
          .catch((err) => console.error('Failed to load AI application types', err))
      } catch (error) {
        console.error('Failed to load filter options', error)
      }
    }
    fetchFilterOptions()
  }, [])

  // 2. מעקב ועדכון דינמי של כמות האג'נטים בהתאם לסוג יישום ה-AI שנבחר
  useEffect(() => {
    if (draftTender.aiApplicationType === 'אייגנט') {
      setAgents((current) => (current.length > 0 ? [current[0]] : ['']))
    } else if (draftTender.aiApplicationType === 'מולטי אייגנט') {
      setAgents((current) => {
        const nextAgents = [...current]
        while (nextAgents.length < 2) nextAgents.push('')
        return nextAgents
      })
    }
  }, [draftTender.aiApplicationType])

  const handleFieldChange = <K extends keyof Tender>(field: K, value: Tender[K]) => {
    setDraftTender((prev) => ({ ...prev, [field]: value }))
  }

  // ניהול שינויים במערך האג'נטים
  const handleAgentChange = (index: number, value: string) => {
    const nextAgents = [...agents]
    nextAgents[index] = value
    setAgents(nextAgents)
  }

  const addAgent = () => {
    setAgents((current) => [...current, ''])
  }

  const removeAgent = (index: number) => {
    setAgents((current) => current.filter((_, agentIndex) => agentIndex !== index))
  }

  // פונקציית שמירה/עדכון
  const saveTender = async () => {
    if (!draftTender.id) return

    setIsLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    // הכנת ה-Payload ושזירת האג'נטים רק במידה ורלוונטי
    const isAgentType = draftTender.aiApplicationType === 'אייגנט' || draftTender.aiApplicationType === 'מולטי אייגנט'
    const payload: Tender = {
      ...draftTender,
      agentsRequired: isAgentType ? agents.map((a) => a.trim()).filter((a) => a.length > 0) : [],
    }

    try {
      const response = await apiCall<{ success: boolean; tender: Tender }>(
        API_ENDPOINTS.tenders.update(draftTender.id),
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
      )

      if (response.success) {
        setSuccessMessage('המכרז עודכן בהצלחה')
        onUpdateTender(response.tender)
        setTimeout(() => onClose(), 1500)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'שגיאה בעדכון המכרז')
    } finally {
      setIsLoading(false)
    }
  }

  // פונקציית סגירת המכרז (הפיכה ללא פעיל)
  const closeTender = async () => {
    if (!draftTender.id) return

    setIsLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await apiCall<{ success: boolean; tender: Tender }>(
        API_ENDPOINTS.tenders.close(draftTender.id),
        {
          method: 'PATCH',
        },
      )

      if (response.success) {
        setSuccessMessage('המכרז נסגר בהצלחה')
        onDeleteTender(draftTender.id)
        setTimeout(() => onClose(), 1500)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'שגיאה בסגירת המכרז')
    } finally {
      setIsLoading(false)
    }
  }

  const showAgentsSection = draftTender.aiApplicationType === 'אייגנט' || draftTender.aiApplicationType === 'מולטי אייגנט'

  return (
    <article className="detail-panel content-page-full" style={{ padding: '24px', maxWidth: '95%', margin: '0 auto', boxSizing: 'border-box' }} dir="rtl">
      <header className="detail-panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>עדכון פרטי המכרז</h2>
        <button type="button" className="tab-button" onClick={onClose}>
          חזור לרשימה
        </button>
      </header>

      <div className="tender-form" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* שם המכרז */}
        <div className="detail-field">
          <label htmlFor="tender-title" style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>שם המכרז</label>
          <input
            id="tender-title"
            value={draftTender.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </div>

        {/* הסבר / תיאור */}
        <div className="detail-field">
          <label htmlFor="tender-shortDescription" style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>הסבר / תאור</label>
          <textarea
            id="tender-shortDescription"
            rows={4}
            value={draftTender.shortDescription ?? ''}
            onChange={(e) => handleFieldChange('shortDescription', e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </div>

        {/* בחירת סוג מוצר ויישום AI מתוך רשימה סגורה */}
        <div className="selection-cards-row" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          
          {/* קוביה א': סוג המוצר */}
          <div className="sidebar-card" style={{ flex: '1', minWidth: '280px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 4px 0' }}>סוג המוצר</h3>
            <p className="helper-text" style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>בחירת סוג מוצר אחד</p>
            <div className="domain-list" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {productTypeOptions.map((type) => {
                const selected = draftTender.productType === type
                return (
                  <button
                    type="button"
                    key={type}
                    className={`domain-chip ${selected ? 'selected' : ''}`}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: '1px solid',
                      borderColor: selected ? '#0070f3' : '#ccc',
                      backgroundColor: selected ? '#e6f4ff' : '#fff',
                      color: selected ? '#0070f3' : '#333',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleFieldChange('productType', draftTender.productType === type ? '' : type)}
                  >
                    {type}
                  </button>
                )
              })}
            </div>
          </div>

          {/* קוביה ב': צורת שימוש ב-AI */}
          <div className="sidebar-card" style={{ flex: '1', minWidth: '280px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 4px 0' }}>צורת שימוש ב-AI</h3>
            <p className="helper-text" style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>בחירת צורת שימוש אחת</p>
            <div className="domain-list" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {aiApplicationOptions.map((appType) => {
                const selected = draftTender.aiApplicationType === appType
                return (
                  <button
                    type="button"
                    key={appType}
                    className={`domain-chip ${selected ? 'selected' : ''}`}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: '1px solid',
                      borderColor: selected ? '#0070f3' : '#ccc',
                      backgroundColor: selected ? '#e6f4ff' : '#fff',
                      color: selected ? '#0070f3' : '#333',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleFieldChange('aiApplicationType', draftTender.aiApplicationType === appType ? '' : appType)}
                  >
                    {appType}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* שדות אג'נטים דינמיים - מוצגים רק במידת הצורך */}
        {showAgentsSection && (
          <div className="form-section" style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
            <div className="section-title" style={{ fontWeight: 'bold', marginBottom: '12px' }}>הסבר על אג'נט</div>
            <div className="agent-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {agents.map((agentText, index) => (
                <div key={index} className="agent-item">
                  <label htmlFor={`agent-${index}`} style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                    הסבר על אג'נט {index + 1}
                  </label>
                  <div className="agent-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <textarea
                      id={`agent-${index}`}
                      value={agentText}
                      onChange={(e) => handleAgentChange(index, e.target.value)}
                      placeholder={`רשום תיאור לאג'נט ${index + 1}`}
                      style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                      rows={2}
                      maxLength={300}
                    />
                    {agents.length > 1 && (
                      <button
                        type="button"
                        className="remove-agent"
                        style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontSize: '18px' }}
                        onClick={() => removeAgent(index)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {draftTender.aiApplicationType === 'מולטי אייגנט' && (
              <button type="button" className="button-green" style={{ marginTop: '12px', padding: '6px 12px', cursor: 'pointer' }} onClick={addAgent}>
                הוספת אג'נט +
              </button>
            )}
          </div>
        )}

        {/* שורת זמן נדרש ותקציב */}
        <div className="detail-row">
          <div className="detail-field">
            <label htmlFor="tender-timeRequired" style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>כמה זמן ניתן לביצוע המשימה</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="tender-timeRequired-value"
                value={draftTender.timeRequired?.value ?? 0}
                onChange={(e) => handleFieldChange('timeRequired', { ...draftTender.timeRequired, value: Number(e.target.value) } as TenderTime)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '40%' }}
                type="number"
                min={0}
              />
              <select
                id="tender-timeRequired-unit"
                value={draftTender.timeRequired?.unit ?? 'ימים'}
                onChange={(e) => handleFieldChange('timeRequired', { ...draftTender.timeRequired, unit: e.target.value } as TenderTime)}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '60%' }}
              >
                {timeUnits.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="detail-field">
            <label htmlFor="tender-budget" style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>תקציב</label>
            <input
              id="tender-budget"
              value={draftTender.budget ?? 0}
              onChange={(e) => handleFieldChange('budget', Number(e.target.value))}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
              type="number"
              min={0}
            />
          </div>
        </div>

        {/* פרטים נוספים וקבלת אימייל */}
        <div className="footer-row" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <div className="footer-main" style={{ flex: 2 }}>
            <label htmlFor="tender-additionalDetails" style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>פרטים נוספים</label>
            <textarea
              id="tender-additionalDetails"
              rows={3}
              value={draftTender.additionalDetails ?? ''}
              onChange={(e) => handleFieldChange('additionalDetails', e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>
          <div className="footer-side" style={{ flex: 1, marginTop: '30px' }}>
            <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={draftTender.wantsEmails ?? false}
                onChange={(e) => handleFieldChange('wantsEmails', e.target.checked)}
              />
              <span className="toggle-text">מעוניין לקבל מיילים</span>
            </label>
          </div>
        </div>
      </div>

      {/* רשימת מועמדים קיימים */}
      <section className="applicants-section" style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <h3>מועמדים ({tender.applicants?.length ?? 0})</h3>
        {tender.applicants && tender.applicants.length > 0 ? (
          tender.applicants.map((applicant, index) => (
            <article key={`${applicant.email}-${index}`} className="applicant-card" style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '10px' }}>
              <h4>{applicant.name}</h4>
              <p><strong>אימייל:</strong> {applicant.email}</p>
              <p><strong>פרטים:</strong> {applicant.details}</p>
              {applicant.proposal && <p><strong>הצעה:</strong> {applicant.proposal}</p>}
              {applicant.contactMethod && <p><strong>דרכי קשר:</strong> {applicant.contactMethod}</p>}
            </article>
          ))
        ) : (
          <p style={{ color: '#666' }}>אין עדיין מועמדים שנרשמו למכרז זה.</p>
        )}
      </section>

      {/* פעולות, שגיאות והודעות הצלחה */}
      <div className="detail-actions" style={{ marginTop: '40px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
        {errorMessage && <div className="error-message" style={{ color: 'red', background: '#ffebee', padding: '8px 12px', borderRadius: '4px' }}>{errorMessage}</div>}
        {successMessage && <div className="success-message" style={{ color: 'green', background: '#e8f5e9', padding: '8px 12px', borderRadius: '4px' }}>{successMessage}</div>}
        
        <button type="button" className="button-green submit-button" onClick={saveTender} disabled={isLoading} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          {isLoading ? 'שומר...' : 'שמור עדכון'}
        </button>

        {showCloseConfirmation ? (
          <div className="close-confirmation" style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff3cd', padding: '8px', borderRadius: '6px' }}>
            <span>האם אתה בטוח שברצונך לסגור את המכרז?</span>
            <button type="button" className="primary-button" onClick={closeTender} disabled={isLoading} style={{ background: 'red', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
              כן, סגור מכרז
            </button>
            <button type="button" className="secondary-button" onClick={() => setShowCloseConfirmation(false)} disabled={isLoading} style={{ padding: '6px 12px', cursor: 'pointer' }}>
              ביטול
            </button>
          </div>
        ) : (
          <button type="button" className="secondary-button" onClick={() => setShowCloseConfirmation(true)} disabled={isLoading} style={{ padding: '10px 20px', cursor: 'pointer' }}>
            סגירת המכרז
          </button>
        )}
      </div>
    </article>
  )
}