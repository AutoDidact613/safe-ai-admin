import { useEffect, useState } from 'react'
import { apiCall, API_ENDPOINTS } from '../../config/api'

interface TenderFormData {
  tenderName: string
  explanation: string
  agents: string[]
  selectedDomains: string[]
  duration: string
  budget: string
  additionalDetails: string
  wantsEmails: boolean
}

interface CreateTenderProps {
  onSuccess: () => void
}


export default function CreateTender({ onSuccess }: CreateTenderProps) {
  const [formData, setFormData] = useState<TenderFormData>({
    tenderName: '',
    explanation: '',
    agents: ['', ''],
    selectedDomains: [],
    duration: '',
    budget: '',
    additionalDetails: '',
    wantsEmails: false,
  })

  const [formMessage, setFormMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [domainOptions , setDomainOptions] = useState<string[]>([])

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const domains = await apiCall<string[]>(API_ENDPOINTS.tenders.getFields)
        setDomainOptions(domains)
      } catch (error) {
        console.error('Failed to load domains', error)
      }
    }

    fetchDomains()
  }, [])

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = event.target
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? (event.target as HTMLInputElement).checked : value,
    }))
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

  const toggleDomain = (domain: string) => {
    setFormData((current) => {
      const alreadySelected = current.selectedDomains.includes(domain)
      const nextSelected = alreadySelected
        ? current.selectedDomains.filter((item) => item !== domain)
        : current.selectedDomains.length < 7
        ? [...current.selectedDomains, domain]
        : current.selectedDomains
      return { ...current, selectedDomains: nextSelected }
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormMessage('')
    setErrorMessage('')
    await clicledAddTender()
  }

  const clicledAddTender = async () => {
    const payload = {
      title: formData.tenderName,
      shortDescription: formData.explanation,
      publisherUserCode: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!)._id : '000',
      domains: formData.selectedDomains,
      timeRequired: formData.duration,
      budget: formData.budget,
      agentsRequired: formData.agents
        .map((agent) => agent.trim())
        .filter((agent) => agent.length > 0),
      wantsEmails: formData.wantsEmails,
      additionalDetails: formData.additionalDetails,
    }

    try {
      await apiCall(API_ENDPOINTS.tenders.create, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setFormMessage('המכרז נשלח בהצלחה!')
      setFormData({
        tenderName: '',
        explanation: '',
        agents: ['', ''],
        selectedDomains: [],
        duration: '',
        budget: '',
        additionalDetails: '',
        wantsEmails: false,
      })
      
      setTimeout(() => {
        onSuccess()
      }, 3000)
    } catch (error) {
      console.error('Failed to create tender', error)
      setErrorMessage('לא ניתן לשמור את המכרז כעת. אנא נסה שוב מאוחר יותר.')
    }
  }

  return (
    <div className="page-shell" dir="rtl">
      <form className="tender-form" onSubmit={handleSubmit}>
        <header className="form-header">
          <h1>פתיחת מכרז</h1>
          <div className="form-group">
            <label htmlFor="tenderName">שם המכרז</label>
            <input
              id="tenderName"
              name="tenderName"
              value={formData.tenderName}
              onChange={handleInputChange}
              placeholder="הכנס שם המכרז"
              className="input"
              required
            />
          </div>
        </header>

        <div className="form-grid">
          <section className="main-panel">
            <div className="form-group">
              <label htmlFor="explanation">הסבר / תאור</label>
              <textarea
                id="explanation"
                name="explanation"
                value={formData.explanation}
                onChange={handleInputChange}
                placeholder="תיאור המכרז"
                className="textarea"
                rows={5}
              />
            </div>

            <div className="form-section">
              <div className="section-title">הסבר על אג'נט</div>
              <div className="agent-list">
                {formData.agents.map((agentText, index) => (
                  <div key={index} className="agent-item">
                    <label htmlFor={`agent-${index}`}>הסבר על אג'נט {index + 1}</label>
                    <div className="agent-row">
                      <textarea
                        id={`agent-${index}`}
                        value={agentText}
                        onChange={(event) => handleAgentChange(index, event.target.value)}
                        placeholder={`רשום תיאור לאג'נט ${index + 1}`}
                        className="textarea textarea-small"
                        rows={3}
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
              <button type="button" className="button-green" onClick={addAgent}>
                הוספת אג'נט +
              </button>
            </div>
          </section>

          <aside className="sidebar-panel">
            <div className="sidebar-card">
              <h2>תחומים</h2>
              <p className="helper-text">בחירה עד 7 מתוך מערך קיים</p>
              <div className="domain-list">
                {domainOptions.map((domain) => {
                  const selected = formData.selectedDomains.includes(domain)
                  const disabled =
                    !selected && formData.selectedDomains.length >= 7
                  return (
                    <button
                      type="button"
                      key={domain}
                      className={`domain-chip ${selected ? 'selected' : ''}`}
                      onClick={() => toggleDomain(domain)}
                      disabled={disabled}
                    >
                      {domain}
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>

        <div className="bottom-row">
          <div className="bottom-field">
            <label htmlFor="duration">כמה זמן ניתן לביצוע המשימה</label>
            <input 
              id="duration"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              className="input"
              placeholder="בחר זמן"
            />
          </div>

          <div className="bottom-field">
            <label htmlFor="budget">תקציב</label>
            <input
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={handleInputChange}
              type="text"
              placeholder="הזן סכום"
              className="input"
            />
          </div>
        </div>

        <div className="footer-row">
          <div className="footer-main">
            <label htmlFor="additionalDetails">פרטים נוספים</label>
            <textarea
              id="additionalDetails"
              name="additionalDetails"
              value={formData.additionalDetails}
              onChange={handleInputChange}
              placeholder="הזן פרטים נוספים"
              className="textarea"
              rows={4}
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
              <span className="toggle-text">מעוניין לקבל מיילים</span>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="button-green submit-button">
            שמור ושולח
          </button>
          {formMessage && <div className="success-message">{formMessage}</div>}
          {errorMessage && <div className="error-message">{errorMessage}</div>}
        </div>
      </form>
    </div>
  )
}