import { useState, useEffect } from "react";
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
      setError("שגיאה בטעינת הפרופילים");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedProfileId) {
      setError("אנא בחר פרופיל");
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
      setError("שגיאה בשמירת הפרופיל");
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
        backgroundColor: "rgba(0, 0, 0, 0.5)",
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
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "32px",
          maxWidth: "500px",
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2 style={{ marginBottom: "16px", fontSize: "24px", fontWeight: "bold" }}>
          בחר פרופיל AI
        </h2>

        <div
          className="alert alert-warning"
          style={{ marginBottom: "24px", padding: "16px", borderRadius: "6px" }}
        >
          <strong>⚠️ נדרש פרופיל</strong>
          <p style={{ marginTop: "8px", marginBottom: 0 }}>
            כדי להתחיל להשתמש במערכת, עליך לבחור פרופיל AI. הפרופיל קובע את הגבולות
            והמדיניות של השימוש שלך במערכת.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p>טוען פרופילים...</p>
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
                בחר פרופיל:
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
                  border: "1px solid #ddd",
                  backgroundColor: "#f8f9fa",
                }}
              >
                <option value="">-- בחר פרופיל --</option>
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
                  backgroundColor: "#f0f9ff",
                  borderRadius: "6px",
                  marginBottom: "24px",
                }}
              >
                <p style={{ marginBottom: "8px", fontWeight: "500" }}>
                  פרטי הפרופיל:
                </p>
                {profiles
                  .filter((p) => p._id === selectedProfileId)
                  .map((profile) => (
                    <div key={profile._id}>
                      <p style={{ marginBottom: "4px", fontSize: "14px" }}>
                        <strong>שם:</strong> {profile.name}
                      </p>
                      <p style={{ marginBottom: "4px", fontSize: "14px" }}>
                        <strong>נוצר על ידי:</strong> {profile.createdBy}
                      </p>
                      <p style={{ marginBottom: 0, fontSize: "14px" }}>
                        <strong>אימייל:</strong> {profile.creatorEmail}
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
                {saving ? "שומר..." : "שמור והמשך"}
              </button>
            </div>

            <p
              style={{
                marginTop: "16px",
                fontSize: "14px",
                color: "#666",
                textAlign: "center",
              }}
            >
              תוכל לשנות את הפרופיל בכל עת מהדשבורד שלך
            </p>
          </>
        )}
      </div>
    </div>
  );
}
