import { useEffect, useState } from 'react'
import { apiCall, API_ENDPOINTS } from '../../config/api'
import ProfessionalProfileModal from './ProfessionalProfileModal'
import { normalizeProfile } from './normalize'
import type { ProfessionalProfile, RawProfessionalProfile } from './types'

export default function ProfessionalProfileAvatar() {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    apiCall<RawProfessionalProfile | null>(API_ENDPOINTS.professionalProfile.me)
      .then((raw) => setProfile(raw ? normalizeProfile(raw) : null))
      .catch((error) => console.error('Failed to load professional profile', error))
      .finally(() => setIsLoaded(true))
  }, [])

  if (!isLoaded) return null

  return (
    <div style={{ marginInlineStart: 'auto' }}>
      {profile ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          title="הגדרות הפרופיל המקצועי שלי"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: profile.avatarColor,
            color: '#fff',
            fontWeight: 700,
            fontSize: '16px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {profile.name.trim().charAt(0).toUpperCase()}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          title="יצירת פרופיל מקצועי"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            color: '#475569',
            fontWeight: 700,
            fontSize: '20px',
            border: '1px dashed #94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          +
        </button>
      )}

      {isModalOpen && (
        <ProfessionalProfileModal
          profile={profile}
          onClose={() => setIsModalOpen(false)}
          onSaved={(saved) => setProfile(saved)}
        />
      )}
    </div>
  )
}
