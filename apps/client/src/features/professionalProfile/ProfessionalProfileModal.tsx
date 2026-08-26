import { useState } from 'react'
import type { FormEvent } from 'react'
import { apiCall, API_ENDPOINTS } from '../../config/api'
import { normalizeProfile } from './normalize'
import type { ProfessionalProfile, RawProfessionalProfile, ResumeFile } from './types'

interface Props {
  profile: ProfessionalProfile | null
  onClose: () => void
  onSaved: (profile: ProfessionalProfile) => void
}

type FormErrors = Partial<Record<'name' | 'description' | 'experience' | 'portfolioLink' | 'resumeFile', string>>

const INPUT_LIMITS = {
  name: 50,
  description: 1000,
  experience: 1000,
  portfolioLink: 500,
} as const

const URL_REGEX = /^https?:\/\/.+/i
const RESUME_MAX_SIZE_BYTES = 5 * 1024 * 1024
const RESUME_ALLOWED_TYPE = 'application/pdf'
const MAX_RESUME_FILES = 6

export default function ProfessionalProfileModal({ profile, onClose, onSaved }: Props) {
  const [name, setName] = useState(profile?.name ?? '')
  const [description, setDescription] = useState(profile?.description ?? '')
  const [experience, setExperience] = useState(profile?.experience ?? '')
  const [portfolioLink, setPortfolioLink] = useState(profile?.portfolioLink ?? '')
  const [resumeFiles, setResumeFiles] = useState<ResumeFile[]>(profile?.resumeFiles ?? [])
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingResume, setIsUploadingResume] = useState(false)

  const validateForm = () => {
    const nextErrors: FormErrors = {}

    const trimmedName = name.trim()
    if (!trimmedName) {
      nextErrors.name = 'יש להזין שם'
    } else if (trimmedName.length > INPUT_LIMITS.name) {
      nextErrors.name = `שם יכול להכיל עד ${INPUT_LIMITS.name} תווים`
    }

    if (description.trim().length > INPUT_LIMITS.description) {
      nextErrors.description = `תיאור יכול להכיל עד ${INPUT_LIMITS.description} תווים`
    }

    if (experience.trim().length > INPUT_LIMITS.experience) {
      nextErrors.experience = `ניסיון יכול להכיל עד ${INPUT_LIMITS.experience} תווים`
    }

    const trimmedPortfolioLink = portfolioLink.trim()
    if (trimmedPortfolioLink) {
      if (trimmedPortfolioLink.length > INPUT_LIMITS.portfolioLink) {
        nextErrors.portfolioLink = `הקישור יכול להכיל עד ${INPUT_LIMITS.portfolioLink} תווים`
      } else if (!URL_REGEX.test(trimmedPortfolioLink)) {
        nextErrors.portfolioLink = 'יש להזין קישור תקין (החל ב-http:// או https://)'
      }
    }

    setErrors(nextErrors)
    return nextErrors
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaving) return

    const nextErrors = validateForm()
    if (Object.keys(nextErrors).length > 0) return

    setIsSaving(true)

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      experience: experience.trim() || undefined,
      portfolioLink: portfolioLink.trim() || undefined,
    }

    try {
      const response = profile
        ? await apiCall<{ success: boolean; profile: RawProfessionalProfile }>(
            API_ENDPOINTS.professionalProfile.update,
            { method: 'PUT', body: JSON.stringify(payload) },
          )
        : await apiCall<{ success: boolean; profile: RawProfessionalProfile }>(
            API_ENDPOINTS.professionalProfile.create,
            { method: 'POST', body: JSON.stringify(payload) },
          )

      onSaved(normalizeProfile(response.profile))
    } catch (error) {
      console.error('Failed to save professional profile', error)
      setErrors((prev) => ({ ...prev, name: 'שמירת הפרופיל נכשלה, נסה שוב' }))
    } finally {
      setIsSaving(false)
    }
  }

  const handleResumeUpload = async (file: File | null) => {
    if (!file) return

    if (resumeFiles.length >= MAX_RESUME_FILES) {
      setErrors((prev) => ({ ...prev, resumeFile: `ניתן לצרף עד ${MAX_RESUME_FILES} קבצים` }))
      return
    }
    if (file.type !== RESUME_ALLOWED_TYPE) {
      setErrors((prev) => ({ ...prev, resumeFile: 'ניתן לצרף קובץ PDF בלבד' }))
      return
    }
    if (file.size > RESUME_MAX_SIZE_BYTES) {
      setErrors((prev) => ({ ...prev, resumeFile: 'גודל הקובץ חייב להיות עד 5MB' }))
      return
    }

    setErrors((prev) => ({ ...prev, resumeFile: undefined }))
    setIsUploadingResume(true)

    try {
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
        throw new Error('העלאת הקובץ ל-S3 נכשלה')
      }

      const response = await apiCall<{ success: boolean; profile: RawProfessionalProfile }>(
        API_ENDPOINTS.professionalProfile.addResume,
        {
          method: 'POST',
          body: JSON.stringify({ fileKey: fileUrl, fileName: file.name }),
        },
      )

      setResumeFiles(response.profile.resumeFiles ?? [])
    } catch (error) {
      console.error('Failed to upload resume file', error)
      setErrors((prev) => ({ ...prev, resumeFile: 'העלאת הקובץ נכשלה, נסה שוב' }))
    } finally {
      setIsUploadingResume(false)
    }
  }

  const handleResumeDelete = async (fileKey: string) => {
    try {
      const response = await apiCall<{ success: boolean; profile: RawProfessionalProfile }>(
        API_ENDPOINTS.professionalProfile.removeResume(fileKey),
        { method: 'DELETE' },
      )
      setResumeFiles(response.profile.resumeFiles ?? [])
    } catch (error) {
      console.error('Failed to delete resume file', error)
      setErrors((prev) => ({ ...prev, resumeFile: 'מחיקת הקובץ נכשלה, נסה שוב' }))
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>הגדרות פרופיל מקצועי</h2>
            <p>פעיל בלוח המכרזים בלבד — בעלי מכרזים יוכלו לצפות בו כשתגיש מועמדות</p>
          </div>
          <div>
            <button type="button" className="tab-button" onClick={onClose}>
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
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                }}
                placeholder="שם מלא"
                maxLength={INPUT_LIMITS.name}
                required
              />
              {errors.name && <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.name}</span>}
            </label>

            <label className="form-field form-full">
              <span className="form-label">תיאור</span>
              <textarea
                className="form-textarea"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }))
                }}
                placeholder="ספר על עצמך ועל ההתמחות שלך"
                maxLength={INPUT_LIMITS.description}
                rows={4}
              />
              {errors.description && <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.description}</span>}
            </label>

            <label className="form-field form-full">
              <span className="form-label">ניסיון</span>
              <textarea
                className="form-textarea"
                value={experience}
                onChange={(e) => {
                  setExperience(e.target.value)
                  if (errors.experience) setErrors((prev) => ({ ...prev, experience: undefined }))
                }}
                placeholder="תאר את הניסיון המקצועי שלך"
                maxLength={INPUT_LIMITS.experience}
                rows={4}
              />
              {errors.experience && <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.experience}</span>}
            </label>

            <label className="form-field">
              <span className="form-label">קישור לתיק עבודות</span>
              <input
                className="form-input"
                type="url"
                value={portfolioLink}
                onChange={(e) => {
                  setPortfolioLink(e.target.value)
                  if (errors.portfolioLink) setErrors((prev) => ({ ...prev, portfolioLink: undefined }))
                }}
                placeholder="https://..."
                maxLength={INPUT_LIMITS.portfolioLink}
              />
              {errors.portfolioLink && <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.portfolioLink}</span>}
            </label>

            <div className="form-field form-full">
              <span className="form-label">קבצי קורות חיים ({resumeFiles.length}/{MAX_RESUME_FILES})</span>
              {resumeFiles.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0' }}>
                  {resumeFiles.map((file) => (
                    <li
                      key={file.fileKey}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}
                    >
                      <span>{file.fileName}</span>
                      <button type="button" className="secondary-button" onClick={() => handleResumeDelete(file.fileKey)}>
                        מחיקה
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {resumeFiles.length < MAX_RESUME_FILES && (
                <input
                  className="form-input"
                  type="file"
                  accept="application/pdf"
                  disabled={isUploadingResume}
                  onChange={(e) => {
                    handleResumeUpload(e.target.files?.[0] ?? null)
                    e.target.value = ''
                  }}
                />
              )}
              {errors.resumeFile && <span style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '4px' }}>{errors.resumeFile}</span>}
            </div>
          </div>

          <div className="modal-actions mt-18 actions-row">
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'שומר...' : 'שמירה'}
            </button>
            <button type="button" className="secondary-button" onClick={onClose} disabled={isSaving}>
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
