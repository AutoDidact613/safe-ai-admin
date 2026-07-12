import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiCall, API_ENDPOINTS } from '../../config/api'
import AiThinkingLoader from './AiThinkingLoader.tsx'


interface TenderFormData {
  tenderName: string
  explanation: string
  agents: string[]
  productType: string
  aiApplicationType: string
  isActive: boolean
  duration: { value: number; unit: 'שעות' | 'ימים' | 'שבועות' | 'חודשים' | 'שנים' }
  budget: number
  additionalDetails: string
  wantsEmails: boolean
}

interface SmartCreateResponse {
  success: boolean
  tender?: {
    title?: string
    shortDescription?: string
    productType?: string
    aiApplicationType?: string
    budget?: number | string
    timeRequired?: {
      value: number
      unit: 'שעות' | 'ימים' | 'שבועות' | 'חודשים' | 'שנים'
    }
    additionalDetails?: string
    agentsRequired?: string[]
  }
}

interface CreateTenderProps {
  onSuccess: () => void
}

export default function CreateTender({ onSuccess }: CreateTenderProps) {
  const { t, i18n } = useTranslation()
  const [formData, setFormData] = useState<TenderFormData>({
    tenderName: '',
    explanation: '',
    agents: ['', ''],
    productType: '',
    aiApplicationType: '',
    isActive: true,
    duration: { value: 0, unit: 'ימים' },
    budget: 0,
    additionalDetails: '',
    wantsEmails: false,
  })

  const [formMessage, setFormMessage] = useState<string>('')
  const [createSuccessMessage, setCreateSuccessMessage] = useState<string>('')
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  const [productTypeOptions, setProductTypeOptions] = useState<string[]>([])
  const [aiApplicationOptions, setAiApplicationOptions] = useState<string[]>([])

  // מצבים חדשים עבור יצירת מכרז חכמה
  const [isSmartOpen, setIsSmartOpen] = useState<boolean>(false)
  const [smartText, setSmartText] = useState<string>('')
  const [isSmartLoading, setIsSmartLoading] = useState<boolean>(false)

  // אפשרויות יחידות זמן
  const timeUnits = ['שעות', 'ימים', 'שבועות', 'חודשים', 'שנים'] as const

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        apiCall<string[]>(API_ENDPOINTS.tenders.getProductTypes)
          .then((types) => {
            if (types) setProductTypeOptions(types)
          })
          .catch((err) => console.error('Failed to load product types', err))

        apiCall<string[]>(API_ENDPOINTS.tenders.getAIApplicationTypes)
          .then((apps) => {
            if (apps) setAiApplicationOptions(apps)
          })
          .catch((err) => console.error('Failed to load AI application types', err))
      } catch (error) {
        console.error('Failed to load filter options', error)
      }
    }

    fetchFilterOptions()
  }, [])

  useEffect(() => {
    if (formData.aiApplicationType === 'אייגנט') {
      setFormData((current) => ({
        ...current,
        agents: current.agents.length > 0 ? [current.agents[0]] : [''],
      }))
    } else if (formData.aiApplicationType === 'מולטי אייגנט') {
      setFormData((current) => {
        const nextAgents = [...current.agents]
        while (nextAgents.length < 2) nextAgents.push('')
        return { ...current, agents: nextAgents.slice(0, 2) }
      })
    }
  }, [formData.aiApplicationType])

  useEffect(() => {
    if (!createSuccessMessage) return undefined

    setShowSuccessOverlay(true)
    const timer = window.setTimeout(() => {
      setShowSuccessOverlay(false)
      setCreateSuccessMessage('')
      onSuccess()
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [createSuccessMessage, onSuccess])

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = event.target
    const fieldValue: string | boolean = type === 'checkbox' ? (event.target as HTMLInputElement).checked : value
    setFormData((current) => ({
      ...current,
      [name]: fieldValue,
    } as TenderFormData))
  }

  const handleAgentChange = (index: number, value: string) => {
    setFormData((current) => {
      const nextAgents = [...current.agents]
      nextAgents[index] = value
      return { ...current, agents: nextAgents }
    })
  }

  const addAgent = () => {
    setFormData((current) => ({
      ...current,
      agents: [...current.agents, ''],
    }))
  }

  const removeAgent = (index: number) => {
    setFormData((current) => ({
      ...current,
      agents: current.agents.filter((_, agentIndex) => agentIndex !== index),
    }))
  }

  const handleProductTypeSelect = (type: string) => {
    setFormData((current) => ({
      ...current,
      productType: current.productType === type ? '' : type,
    }))
  }

  const handleAiApplicationSelect = (appType: string) => {
    setFormData((current) => ({
      ...current,
      aiApplicationType: current.aiApplicationType === appType ? '' : appType,
    }))
  }

  // פונקציה חדשה לשליחת הטקסט ל-AI ומילוי הטופס
  const handleSmartCreateSubmit = async () => {
    if (!smartText.trim()) return
    setIsSmartLoading(true)
    setErrorMessage('')
    try {
      // פנייה לשרת (נניח שנקודת הקצה קיימת תחת API_ENDPOINTS.tenders.smartCreate)
      const response = await apiCall<SmartCreateResponse>(API_ENDPOINTS.tenders.smartCreate, {
        method: 'POST',
        body: JSON.stringify({ text: smartText }),
      })

      if (response) {
        console.log('Smart tender data received:', response)
        setFormData((current) => ({
          ...current,
          tenderName: response.tender?.title || current.tenderName,
          explanation: response.tender?.shortDescription || current.explanation,
          productType: response.tender?.productType || current.productType,
          aiApplicationType: response.tender?.aiApplicationType || current.aiApplicationType,
          budget: Number(response.tender?.budget ?? current.budget),
          duration: response.tender?.timeRequired || current.duration,
          additionalDetails: response.tender?.additionalDetails || current.additionalDetails,
          agents: response.tender?.agentsRequired || current.agents,
        }))
        setFormMessage(t('tenders.smartCreateSuccessMsg'))
        setIsSmartOpen(false)
        setSmartText('')
      }
    } catch (error) {
      console.error('Failed to create smart tender', error)
      setErrorMessage(t('tenders.smartCreateErrorMsg'))
    } finally {
      setIsSmartLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormMessage('')
    setErrorMessage('')
    await clickedAddTender()
  }

  const clickedAddTender = async () => {
    const payload = {
      title: formData.tenderName,
      shortDescription: formData.explanation,
      publisherUserCode: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!)._id : '000',
      productType: formData.productType,
      aiApplicationType: formData.aiApplicationType,
      isActive: formData.isActive,
      timeRequired: formData.duration,
      budget: formData.budget,
      agentsRequired:
        (formData.aiApplicationType === 'אייגנט' || formData.aiApplicationType === 'מולטי אייגנט')
          ? formData.agents.map((agent) => agent.trim()).filter((agent) => agent.length > 0)
          : [],
      wantsEmails: formData.wantsEmails,
      additionalDetails: formData.additionalDetails,
    }

    try {
      await apiCall(API_ENDPOINTS.tenders.create, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setCreateSuccessMessage(t('tenders.tenderSubmittedSuccessMsg'))
      setFormData({
        tenderName: '',
        explanation: '',
        agents: ['', ''],
        productType: '',
        aiApplicationType: '',
        isActive: true,
        duration: { value: 0, unit: 'ימים' },
        budget: 0,
        additionalDetails: '',
        wantsEmails: false,
      })
    } catch (error) {
      console.error('Failed to create tender', error)
      setErrorMessage(t('tenders.tenderSubmitErrorMsg'))
    }
  }

  const showAgentsSection = formData.aiApplicationType === 'אייגנט' || formData.aiApplicationType === 'מולטי אייגנט'

  return (
    <div className="page-shell" dir={i18n.dir()}>
      <form className="tender-form" onSubmit={handleSubmit}>
        <header className="form-header">
          <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '16px' }}>
            <h1>{t('tenders.createTenderTitle')}</h1>

            {/* כפתור יצירת מכרז חכמה */}
            <button
              type="button"
              className="smart-create-btn"
              onClick={() => setIsSmartOpen(!isSmartOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            >
              <span>✨</span>
              {t('tenders.smartCreateBtn')}
            </button>
          </div>

          {/* תיבת הטקסט החכמה שנפתחת בלחיצה */}
          {isSmartOpen && (
            <div className="smart-create-box" style={{ width: '100%', marginTop: '16px', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
              <label htmlFor="smartText" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>{t('tenders.smartCreateLabel')}</label>
              <textarea
                id="smartText"
                value={smartText}
                onChange={(e) => setSmartText(e.target.value)}
                placeholder={t('tenders.smartCreatePlaceholder')}
                className="textarea"
                rows={4}
              />
              <button
                type="button"
                className="button-green"
                onClick={handleSmartCreateSubmit}
                disabled={isSmartLoading}
                style={{ marginTop: '12px' }}
              >
                {isSmartLoading
                  ? <AiThinkingLoader color="#ffffff" />
                  : t('tenders.smartCreateGenerateBtn')
                }
              </button>
            </div>
          )}

          {formMessage && <div className="success-message">{formMessage}</div>}
          {errorMessage && <div className="error-message">{errorMessage}</div>}

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label htmlFor="tenderName">{t('tenders.tenderNameLabel')}</label>
            <input
              id="tenderName"
              name="tenderName"
              value={formData.tenderName}
              onChange={handleInputChange}
              placeholder={t('tenders.tenderNamePlaceholder')}
              className="input"
              maxLength={100}
              required
            />
          </div>
        </header>

        {/* זרימה לינארית נקייה ללא שימוש ב-form-grid הצידי הישן */}
        <div className="form-linear-flow" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* 1. הסבר / תיאור בראש הדף */}
          <div className="form-group">
            <label htmlFor="explanation">{t('tenders.explanationLabel')}</label>
            <textarea
              id="explanation"
              name="explanation"
              value={formData.explanation}
              onChange={handleInputChange}
              placeholder={t('tenders.explanationPlaceholder')}
              className="textarea"
              rows={5}
              maxLength={1000}
            />
          </div>

          {/* 2. שורת התחומים (סוג מוצר וצורת שימוש ב-AI זה לצד זה או בשורה מעוצבת) */}
          <div className="selection-cards-row" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {/* תיבה א': סוג מוצר */}
            <div className="sidebar-card" style={{ flex: '1', minWidth: '280px' }}>
              <h2>{t('tenders.productTypeHeading')}</h2>
              <p className="helper-text">{t('tenders.productTypeHelperText')}</p>
              <div className="domain-list">
                {productTypeOptions.map((type) => {
                  const selected = formData.productType === type
                  return (
                    <button
                      type="button"
                      key={type}
                      className={`domain-chip ${selected ? 'selected' : ''}`}
                      onClick={() => handleProductTypeSelect(type)}
                    >
                      {t(`tenders.productTypeOptions.${type}`, { defaultValue: type })}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* תיבה ב': צורת שימוש ב-AI */}
            <div className="sidebar-card" style={{ flex: '1', minWidth: '280px' }}>
              <h2>{t('tenders.aiApplicationHeading')}</h2>
              <p className="helper-text">{t('tenders.aiApplicationHelperText')}</p>
              <div className="domain-list">
                {aiApplicationOptions.map((appType) => {
                  const selected = formData.aiApplicationType === appType
                  return (
                    <button
                      type="button"
                      key={appType}
                      className={`domain-chip ${selected ? 'selected' : ''}`}
                      onClick={() => handleAiApplicationSelect(appType)}
                    >
                      {t(`tenders.aiApplicationOptions.${appType}`, { defaultValue: appType })}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 3. שדות האג'נטים - מופיעים רק לאחר מכן במידה ונבחרו */}
          {showAgentsSection && (
            <div className="form-section">
              <div className="section-title">{t('tenders.agentExplanationSectionTitle')}</div>
              <div className="agent-list">
                {formData.agents.map((agentText, index) => (
                  <div key={index} className="agent-item">
                    <label htmlFor={`agent-${index}`}>{t('tenders.agentExplanationLabel', { index: index + 1 })}</label>
                    <div className="agent-row">
                      <textarea
                        id={`agent-${index}`}
                        value={agentText}
                        onChange={(event) => handleAgentChange(index, event.target.value)}
                        placeholder={t('tenders.agentDescriptionPlaceholder', { index: index + 1 })}
                        className="textarea textarea-small"
                        rows={3}
                        maxLength={300}
                      />
                      {formData.agents.length > 1 && (
                        <button
                          type="button"
                          className="remove-agent"
                          onClick={() => removeAgent(index)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {formData.aiApplicationType === 'מולטי אייגנט' && (
                <button type="button" className="button-green" onClick={addAgent}>
                  {t('tenders.addAgentBtn')}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bottom-row" style={{ marginTop: '24px' }}>
          <div className="bottom-field">
            <label htmlFor="duration">{t('tenders.durationLabel')}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="duration-value"
                name="duration-value"
                value={formData.duration.value}
                onChange={(e) => setFormData((c) => ({ ...c, duration: { ...c.duration, value: Number(e.target.value) } }))}
                className="input"
                placeholder="מספר"
                type="number"
                min={0}
              />
              <select
                id="duration-unit"
                name="duration-unit"
                value={formData.duration.unit}
                onChange={(e) => setFormData((c) => ({ ...c, duration: { ...c.duration, unit: e.target.value as (typeof timeUnits)[number] } }))}
              >
                {timeUnits.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bottom-field">
            <label htmlFor="budget">{t('tenders.budgetLabel')}</label>
            <input
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={(e) => setFormData((c) => ({ ...c, budget: Number(e.target.value) }))}
              type="number"
              placeholder={t('tenders.budgetPlaceholder')}
              className="input"
              min={0}
            />
          </div>
        </div>

        <div className="footer-row">
          <div className="footer-main">
            <label htmlFor="additionalDetails">{t('tenders.additionalDetailsFieldLabel')}</label>
            <textarea
              id="additionalDetails"
              name="additionalDetails"
              value={formData.additionalDetails}
              onChange={handleInputChange}
              placeholder={t('tenders.additionalDetailsPlaceholder')}
              className="textarea"
              rows={4}
              maxLength={500}
            />
          </div>

          <div className="footer-side">
            <label className="toggle-label">
              <input
                type="checkbox"
                name="wantsEmails"
                checked={formData.wantsEmails}
                onChange={handleInputChange}
                className="toggle-input"
              />
              <span className="toggle-pill" />
              <span className="toggle-text">{t('tenders.wantsEmailsLabel')}</span>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="button-green submit-button">
            {t('tenders.saveAndSubmitBtn')}
          </button>
        </div>
      </form>

      {showSuccessOverlay && createSuccessMessage && (
        <div className="success-modal-overlay" role="alert" aria-live="assertive">
          <div className="success-modal">
            <div className="success-modal__icon">✅</div>
            <div className="success-modal__text">{createSuccessMessage}</div>
          </div>
        </div>
      )}
    </div>
  )
}