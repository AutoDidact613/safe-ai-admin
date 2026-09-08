import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { API_ENDPOINTS, apiCall } from "../config/api";

interface Profile {
  _id: string;
  name: string;
  createdBy: string;
  creatorEmail: string;
}

interface ProfileSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onProfileSelected: (profileId: string) => void;
}

export default function ProfileSelectionModal({
  isOpen,
  onClose,
  userId,
  onProfileSelected,
}: ProfileSelectionModalProps) {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProfiles();
    }
  }, [isOpen]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const data = await apiCall<Profile[]>(API_ENDPOINTS.profiles);
      setProfiles(data);
    } catch (err) {
      console.error("Error fetching profiles:", err);
      setError(t("profileModal.errorLoadingProfiles"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedProfileId) {
      setError(t("profileModal.errorSelectProfile"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiCall(`${API_ENDPOINTS.users}/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          profileId: selectedProfileId,
        }),
      });

      // Update user in localStorage
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      currentUser.profileId = selectedProfileId;
      localStorage.setItem("user", JSON.stringify(currentUser));

      onProfileSelected(selectedProfileId);
      onClose();
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(t("profileModal.errorSavingProfile"));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "var(--bg-overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // Don't allow closing by clicking outside
        }
      }}
    >
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          borderRadius: "8px",
          padding: "32px",
          maxWidth: "500px",
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <h2 style={{ marginBottom: "16px", fontSize: "24px", fontWeight: "bold" }}>
          {t("profileModal.title")}
        </h2>

        <div
          className="alert alert-warning"
          style={{ marginBottom: "24px", padding: "16px", borderRadius: "6px" }}
        >
          <strong>{t("profileModal.warning")}</strong>
          <p style={{ marginTop: "8px", marginBottom: 0 }}>
            {t("profileModal.description")}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p>{t("profileModal.loading")}</p>
          </div>
        ) : (
          <>
            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label
                htmlFor="profile-select"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                  fontSize: "16px",
                }}
              >
                {t("profileModal.selectLabel")}
              </label>
              <select
                id="profile-select"
                value={selectedProfileId}
                onChange={(e) => {
                  setSelectedProfileId(e.target.value);
                  setError(null);
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "16px",
                  borderRadius: "5px",
                  border: "1px solid var(--border-default)",
                  backgroundColor: "var(--bg-elevated)",
                }}
              >
                <option value="">{t("profileModal.selectPlaceholder")}</option>
                {profiles.map((profile) => (
                  <option key={profile._id} value={profile._id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedProfileId && (
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "var(--color-info-bg)",
                  borderRadius: "6px",
                  marginBottom: "24px",
                }}
              >
                <p style={{ marginBottom: "8px", fontWeight: "500" }}>
                  {t("profileModal.profileDetails")}
                </p>
                {profiles
                  .filter((p) => p._id === selectedProfileId)
                  .map((profile) => (
                    <div key={profile._id}>
                      <p style={{ marginBottom: "4px", fontSize: "14px" }}>
                        <strong>{t("profileModal.labelName")}</strong> {profile.name}
                      </p>
                      <p style={{ marginBottom: "4px", fontSize: "14px" }}>
                        <strong>{t("profileModal.labelCreatedBy")}</strong> {profile.createdBy}
                      </p>
                      <p style={{ marginBottom: 0, fontSize: "14px" }}>
                        <strong>{t("profileModal.labelEmail")}</strong> {profile.creatorEmail}
                      </p>
                    </div>
                  ))}
              </div>
            )}

            {error && (
              <div
                className="alert alert-error"
                style={{ marginBottom: "24px", padding: "12px", borderRadius: "6px" }}
              >
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleSave}
                disabled={!selectedProfileId || saving}
                className="btn btn-primary"
                style={{ flex: 1, padding: "12px", fontSize: "16px" }}
              >
                {saving ? t("profileModal.buttonSaving") : t("profileModal.buttonSave")}
              </button>
            </div>

            <p
              style={{
                marginTop: "16px",
                fontSize: "14px",
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              {t("profileModal.footer")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
