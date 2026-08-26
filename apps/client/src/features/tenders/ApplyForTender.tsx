import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiCall, API_ENDPOINTS } from '../../config/api'
import type { Applicant, Tender } from './types'

interface Props {
  tender: Tender
  onSubmit: (applicant: Applicant) => void
  onCancel: () => void
}

type FormErrors = Partial<Record<'name' | 'email' | 'details' | 'proposal' | 'contactMethod' | 'resumeFile' | 'portfolioLink', string>>

const INPUT_LIMITS = {
  name: 50,
  email: 254,
  details: 500,
  contactMethod: 50,
  portfolioLink: 500,
} as const

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_REGEX = /^https?:\/\/.+/i
const RESUME_MAX_SIZE_BYTES = 5 * 1024 * 1024
const RESUME_ALLOWED_TYPE = 'application/pdf'

export default function ApplyForTender({ tender, onSubmit, onCancel }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [details, setDetails] = useState('')
  const [proposal, setProposal] = useState<number | undefined>(undefined)
  const [contactMethod, setContactMethod] = useState('')
  const [portfolioLink, setPortfolioLink] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const validateForm = () => {
    const nextErrors: FormErrors = {}

    const trimmedName = name.trim()
    if (!trimmedName) {
      nextErrors.name = 'יש להזין שם'
    } else if (trimmedName.length > INPUT_LIMITS.name) {
      nextErrors.name = `שם יכול להכיל עד ${INPUT_LIMITS.name} תווים`
    }

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      nextErrors.email = 'יש להזין אימייל'
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = 'יש להזין כתובת אימייל תקינה'
    } else if (trimmedEmail.length > INPUT_LIMITS.email) {
      nextErrors.email = `אימייל יכול להכיל עד ${INPUT_LIMITS.email} תווים`
    }

    const trimmedDetails = details.trim()
    if (!trimmedDetails) {
      nextErrors.details = 'יש להזין פרטים'
    } else if (trimmedDetails.length > INPUT_LIMITS.details) {
      nextErrors.details = `פרטים יכולים להכיל עד ${INPUT_LIMITS.details} תווים`
    }

    if (proposal !== undefined && proposal < 0) {
      nextErrors.proposal = 'ההצעה חייבת להיות מספר חיובי'
    }

    const trimmedContactMethod = contactMethod.trim()
    if (trimmedContactMethod && trimmedContactMethod.length > INPUT_LIMITS.contactMethod) {
      nextErrors.contactMethod = `אמצעי תקשורת יכול להכיל עד ${INPUT_LIMITS.contactMethod} תווים`
    }

    const trimmedPortfolioLink = portfolioLink.trim()
    if (trimmedPortfolioLink) {
      if (trimmedPortfolioLink.length > INPUT_LIMITS.portfolioLink) {
        nextErrors.portfolioLink = `הקישור יכול להכיל עד ${INPUT_LIMITS.portfolioLink} תווים`
      } else if (!URL_REGEX.test(trimmedPortfolioLink)) {
        nextErrors.portfolioLink = 'יש להזין קישור תקין (החל ב-http:// או https://)'
      }
    }

    if (resumeFile) {
      if (resumeFile.type !== RESUME_ALLOWED_TYPE) {
        nextErrors.resumeFile = 'ניתן לצרף קובץ PDF בלבד'
      } else if (resumeFile.size > RESUME_MAX_SIZE_BYTES) {
        nextErrors.resumeFile = 'גודל הקובץ חייב להיות עד 5MB'
      }
    }

    setErrors(nextErrors)
    return nextErrors
  }

  const handleFileChange = (file: File | null) => {
    setResumeFile(file)
    if (errors.resumeFile) {
      setErrors((prev) => ({ ...prev, resumeFile: undefined }))
    }
  }

  const uploadResume = async (file: File): Promise<string> => {
    const { uploadUrl, fileUrl } = await apiCall<{ uploadUrl: string; fileUrl: string }>(
      API_ENDPOINTS.upload.getUrl,
      {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          context: 'tenderResume',
        }),
      },
    )

    const awsResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })

    if (!awsResponse.ok) {
      throw new Error('העלאת קובץ קורות החיים ל-S3 נכשלה')
    }

    return fileUrl
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors = validateForm()
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)

    let resumeFileKey: string | undefined
    if (resumeFile) {
      try {
        resumeFileKey = await uploadResume(resumeFile)
      } catch (error) {
        console.error('Failed to upload resume file', error)
        setErrors((prev) => ({ ...prev, resumeFile: 'העלאת קובץ קורות החיים נכשלה, נסה שוב' }))
        setIsSubmitting(false)
        return
      }
    }

    onSubmit({
      name: name.trim(),
      email: email.trim(),
      details: details.trim(),
      proposal: proposal !== undefined ? proposal : undefined,
      contactMethod: contactMethod.trim() || undefined,
      resumeFileKey,
      portfolioLink: portfolioLink.trim() || undefined,
    })

    setIsSubmitting(false)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>הרשמה למכרז</h2>
            <p>{tender.title}</p>
          </div>
          <div>
            <button type="button" className="tab-button" onClick={onCancel}>
              Close
            </button>
          </div>
        </header>

        <form className="modal-section apply-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span className="form-label">שם</span>
              <input
                className="form-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) {
                    setErrors((prev) => ({ ...prev, name: undefined }))
                  }
                }}
                placeholder="שם מלא"
                maxLength={INPUT_LIMITS.name}
                required
              />
              {errors.name && <span style={{ display: 'block', width: '100%', color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.name}</span>}
            </label>

            <label className="form-field">
              <span className="form-label">אימייל</span>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) {
                    setErrors((prev) => ({ ...prev, email: undefined }))
                  }
                }}
                placeholder="example@mail.com"
                maxLength={INPUT_LIMITS.email}
                required
              />
              {errors.email && <span style={{ display: 'block', width: '100%', color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.email}</span>}
            </label>

            <label className="form-field form-full">
              <span className="form-label">פרטים</span>
              <textarea
                className="form-textarea"
                value={details}
                onChange={(e) => {
                  setDetails(e.target.value)
                  if (errors.details) {
                    setErrors((prev) => ({ ...prev, details: undefined }))
                  }
                }}
                placeholder="ספר לנו על עצמך וההצעה שלך"
                maxLength={INPUT_LIMITS.details}
                required
                rows={5}
              />
              {errors.details && <span style={{ display: 'block', width: '100%', color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.details}</span>}
            </label>

            <label className="form-field">
              <span className="form-label">הצעה - בשקלים</span>
              <input
                className="form-input"
                type="number"
                value={proposal ?? ''}
                onChange={(e) => {
                  const nextValue = e.target.value === '' ? undefined : Number(e.target.value)
                  setProposal(nextValue)
                  if (errors.proposal) {
                    setErrors((prev) => ({ ...prev, proposal: undefined }))
                  }
                }}
                placeholder="כמה תרצה לגבות עבור העבודה"
                min="0"
                max="999999999"
                inputMode="numeric"
              />
              {errors.proposal && <span style={{ display: 'block', width: '100%', color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.proposal}</span>}
            </label>

            <label className="form-field">
              <span className="form-label">אמצעי תקשורת</span>
              <input
                className="form-input"
                type="text"
                value={contactMethod}
                onChange={(e) => {
                  setContactMethod(e.target.value)
                  if (errors.contactMethod) {
                    setErrors((prev) => ({ ...prev, contactMethod: undefined }))
                  }
                }}
                placeholder="טלפון / אימייל"
                maxLength={INPUT_LIMITS.contactMethod}
              />
              {errors.contactMethod && <span style={{ display: 'block', width: '100%', color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.contactMethod}</span>}
            </label>

            <label className="form-field">
              <span className="form-label">קורות חיים (PDF, עד 5MB)</span>
              <input
                className="form-input"
                type="file"
                accept="application/pdf"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              {errors.resumeFile && <span style={{ display: 'block', width: '100%', color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.resumeFile}</span>}
            </label>

            <label className="form-field">
              <span className="form-label">קישור לתיק עבודות</span>
              <input
                className="form-input"
                type="url"
                value={portfolioLink}
                onChange={(e) => {
                  setPortfolioLink(e.target.value)
                  if (errors.portfolioLink) {
                    setErrors((prev) => ({ ...prev, portfolioLink: undefined }))
                  }
                }}
                placeholder="https://..."
                maxLength={INPUT_LIMITS.portfolioLink}
              />
              {errors.portfolioLink && <span style={{ display: 'block', width: '100%', color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.portfolioLink}</span>}
            </label>
          </div>

          <div className="modal-actions mt-18 actions-row">
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'שולח...' : 'הגש מועמדות'}
            </button>
            <button type="button" className="secondary-button" onClick={onCancel} disabled={isSubmitting}>
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
