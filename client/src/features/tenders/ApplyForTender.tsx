import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Applicant, Tender } from './types'

interface Props {
  tender: Tender
  onSubmit: (applicant: Applicant) => void
  onCancel: () => void
}

type FormErrors = Partial<Record<'name' | 'email' | 'details' | 'proposal' | 'contactMethod', string>>

const INPUT_LIMITS = {
  name: 50,
  email: 254,
  details: 500,
  contactMethod: 50,
} as const

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ApplyForTender({ tender, onSubmit, onCancel }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [details, setDetails] = useState('')
  const [proposal, setProposal] = useState<number | undefined>(undefined)
  const [contactMethod, setContactMethod] = useState('')
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

    setErrors(nextErrors)
    return nextErrors
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validateForm()
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      name: name.trim(),
      email: email.trim(),
      details: details.trim(),
      proposal: proposal !== undefined ? proposal : undefined,
      contactMethod: contactMethod.trim() || undefined,
    })
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>{t('tenders.applyToTenderLabel')}</h2>
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
              <span className="form-label">{t('tenders.nameLabel')}</span>
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
                placeholder={t('tenders.namePlaceholder')}
                maxLength={INPUT_LIMITS.name}
                required
              />
              {errors.name && <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.name}</span>}
            </label>

            <label className="form-field">
              <span className="form-label">{t('tenders.emailLabel')}</span>
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
              {errors.email && <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.email}</span>}
            </label>

            <label className="form-field form-full">
              <span className="form-label">{t('tenders.detailsLabel')}</span>
              <textarea
                className="form-textarea"
                value={details}
                onChange={(e) => {
                  setDetails(e.target.value)
                  if (errors.details) {
                    setErrors((prev) => ({ ...prev, details: undefined }))
                  }
                }}
                placeholder={t('tenders.detailsPlaceholder')}
                maxLength={INPUT_LIMITS.details}
                required
                rows={5}
              />
              {errors.details && <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.details}</span>}
            </label>

            <label className="form-field">
              <span className="form-label">{t('tenders.proposalLabel')}</span>
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
                placeholder={t('tenders.proposalPlaceholder')}
                min="0"
                max="999999999"
                inputMode="numeric"
              />
              {errors.proposal && <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.proposal}</span>}
            </label>

            <label className="form-field">
              <span className="form-label">{t('tenders.contactMethodLabel')}</span>
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
                placeholder={t('tenders.contactMethodPlaceholder')}
                maxLength={INPUT_LIMITS.contactMethod}
              />
              {errors.contactMethod && <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.contactMethod}</span>}
            </label>
          </div>

          <div className="modal-actions mt-18 actions-row">
            <button type="submit" className="primary-button">
              {t('tenders.submitApplicationBtn')}
            </button>
            <button type="button" className="secondary-button" onClick={onCancel}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
