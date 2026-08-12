import { useState, useEffect } from "react";
import { API_ENDPOINTS, apiCall } from "../../config/api";

interface ProviderKey {
  _id: string;
  userId?: string;
  provider: "openai" | "anthropic" | "google" | "groq";
  keyPrefix: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt?: string;
}

interface ProviderKeysManagementProps {
  userId: string;
  userEmail: string;
  onClose: () => void;
}

export default function ProviderKeysManagement({ userId, userEmail, onClose }: ProviderKeysManagementProps) {
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    provider: "openai" as "openai" | "anthropic" | "google" | "groq",
    apiKey: "",
    isActive: true,
  });

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const allKeys = await apiCall<ProviderKey[]>(API_ENDPOINTS.providerKeys);
      // Filter keys for this specific user
      const userKeys = allKeys.filter(key => key.userId === userId);
      setKeys(userKeys);
    } catch (error) {
      console.error("Failed to fetch provider keys:", error);
      alert("שגיאה בטעינת מפתחות");
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await apiCall(API_ENDPOINTS.providerKeys, {
        method: "POST",
        body: JSON.stringify({
          userId,
          provider: formData.provider,
          apiKey: formData.apiKey,
          isActive: formData.isActive,
          isSystem: false,
        }),
      });

      await fetchKeys();
      setShowAddModal(false);
      resetForm();
      alert("המפתח נוסף בהצלחה");
    } catch (error: unknown) {
      console.error("Error adding provider key:", error);
      const errorMessage = error instanceof Error ? error.message : "שגיאה לא ידועה";
      alert(`שגיאה בהוספת מפתח: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (keyId: string, currentStatus: boolean) => {
    try {
      await apiCall(`${API_ENDPOINTS.providerKeys}/${keyId}`, {
        method: "PUT",
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });

      await fetchKeys();
      alert(`המפתח ${!currentStatus ? "הופעל" : "הושבת"} בהצלחה`);
    } catch (error: unknown) {
      console.error("Error toggling key status:", error);
      const errorMessage = error instanceof Error ? error.message : "שגיאה לא ידועה";
      alert(`שגיאה בעדכון סטטוס: ${errorMessage}`);
    }
  };

  const handleDeleteKey = async (keyId: string, provider: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את מפתח ${provider}?`)) {
      return;
    }

    try {
      await apiCall(`${API_ENDPOINTS.providerKeys}/${keyId}`, {
        method: "DELETE",
      });

      await fetchKeys();
      alert("המפתח נמחק בהצלחה");
    } catch (error: unknown) {
      console.error("Error deleting key:", error);
      const errorMessage = error instanceof Error ? error.message : "שגיאה לא ידועה";
      alert(`שגיאה במחיקת מפתח: ${errorMessage}`);
    }
  };

  const resetForm = () => {
    setFormData({
      provider: "openai",
      apiKey: "",
      isActive: true,
    });
  };

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      openai: "🤖",
      anthropic: "🧠",
      google: "🔍",
      groq: "⚡",
    };
    return icons[provider] || "🔑";
  };

  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      openai: "OpenAI",
      anthropic: "Anthropic (Claude)",
      google: "Google (Gemini)",
      groq: "Groq",
    };
    return names[provider] || provider;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "800px", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="modal-header">
          <h2>🔑 ניהול API Keys - {userEmail}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <div style={{ 
            backgroundColor: "#e7f3ff", 
            border: "1px solid #2196F3", 
            borderRadius: "4px", 
            padding: "15px", 
            marginBottom: "20px" 
          }}>
            <strong>ℹ️ הסבר:</strong>
            <p style={{ margin: "10px 0 0 0", fontSize: "14px" }}>
              משתמש במצב BYOK (Bring Your Own Key) יכול להוסיף מפתחות API משלו לספקים שונים.
              המפתחות מוצפנים ונשמרים בצורה מאובטחת.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0 }}>מפתחות קיימים ({keys.length})</h3>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowAddModal(true)}
            >
              + הוסף מפתח
            </button>
          </div>

          {loading ? (
            <div className="loading-state">טוען מפתחות...</div>
          ) : keys.length === 0 ? (
            <div className="empty-state">
              <p>אין מפתחות למשתמש זה</p>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                הוסף מפתח ראשון
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {keys.map((key) => (
                <div 
                  key={key._id} 
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "15px",
                    backgroundColor: key.isActive ? "#fff" : "#f5f5f5",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "24px" }}>{getProviderIcon(key.provider)}</span>
                      <div>
                        <h4 style={{ margin: 0 }}>{getProviderName(key.provider)}</h4>
                        <p style={{ margin: "5px 0 0 0", fontSize: "13px", color: "#666", fontFamily: "monospace" }}>
                          {key.keyPrefix}...
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <span className={key.isActive ? "badge badge-success" : "badge badge-secondary"}>
                        {key.isActive ? "פעיל" : "לא פעיל"}
                      </span>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleToggleActive(key._id, key.isActive)}
                        style={{ padding: "5px 15px", fontSize: "13px" }}
                      >
                        {key.isActive ? "השבת" : "הפעל"}
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteKey(key._id, key.provider)}
                        style={{ padding: "5px 15px", fontSize: "13px" }}
                      >
                        מחק
                      </button>
                    </div>
                  </div>
                  {key.createdAt && (
                    <p style={{ margin: "10px 0 0 0", fontSize: "12px", color: "#999" }}>
                      נוצר: {new Date(key.createdAt).toLocaleDateString("he-IL")} {new Date(key.createdAt).toLocaleTimeString("he-IL")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            סגור
          </button>
        </div>
      </div>

      {/* Add Key Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>הוסף API Key חדש</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleAddKey}>
              <div className="form-group">
                <label>ספק *</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value as "openai" | "anthropic" | "google" | "groq" })}
                  required
                >
                  <option value="openai">🤖 OpenAI</option>
                  <option value="anthropic">🧠 Anthropic (Claude)</option>
                  <option value="google">🔍 Google (Gemini)</option>
                  <option value="groq">⚡ Groq</option>
                </select>
              </div>

              <div className="form-group">
                <label>API Key *</label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  required
                  placeholder="sk-..."
                  style={{ fontFamily: "monospace" }}
                />
                <small style={{ display: "block", marginTop: "5px", color: "#666" }}>
                  המפתח יוצפן ויישמר בצורה מאובטחת
                </small>
              </div>

              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  מפתח פעיל
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                >
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "שומר..." : "הוסף מפתח"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
