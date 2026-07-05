import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      alert(t("providerKeysManagement.errorLoadingKeys"));
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
      alert(t("providerKeysManagement.keyAddedSuccess"));
    } catch (error: unknown) {
      console.error("Error adding provider key:", error);
      const errorMessage = error instanceof Error ? error.message : t("usersManagement.errorUnknown");
      alert(t("providerKeysManagement.addKeyErrorPrefix", { message: errorMessage }));
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
      alert(!currentStatus ? t("userApiKeys.keyEnabledSuccess") : t("userApiKeys.keyDisabledSuccess"));
    } catch (error: unknown) {
      console.error("Error toggling key status:", error);
      const errorMessage = error instanceof Error ? error.message : t("usersManagement.errorUnknown");
      alert(t("providerKeysManagement.updateStatusErrorPrefix", { message: errorMessage }));
    }
  };

  const handleDeleteKey = async (keyId: string, provider: string) => {
    if (!confirm(t("providerKeysManagement.deleteKeyConfirm", { provider }))) {
      return;
    }

    try {
      await apiCall(`${API_ENDPOINTS.providerKeys}/${keyId}`, {
        method: "DELETE",
      });

      await fetchKeys();
      alert(t("providerKeysManagement.keyDeletedSuccess"));
    } catch (error: unknown) {
      console.error("Error deleting key:", error);
      const errorMessage = error instanceof Error ? error.message : t("usersManagement.errorUnknown");
      alert(t("providerKeysManagement.deleteKeyErrorPrefix", { message: errorMessage }));
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
          <h2>🔑 {t("providerKeysManagement.modalTitle", { email: userEmail })}</h2>
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
            <strong>ℹ️ {t("providerKeysManagement.explanationLabel")}</strong>
            <p style={{ margin: "10px 0 0 0", fontSize: "14px" }}>
              {t("providerKeysManagement.byokExplanation")}
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ margin: 0 }}>{t("providerKeysManagement.existingKeysTitle", { count: keys.length })}</h3>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              + {t("providerKeysManagement.addKeyButton")}
            </button>
          </div>

          {loading ? (
            <div className="loading-state">{t("providerKeysManagement.loadingKeys")}</div>
          ) : keys.length === 0 ? (
            <div className="empty-state">
              <p>{t("providerKeysManagement.noKeysForUser")}</p>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                {t("userApiKeys.addFirstKeyButton")}
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
                        {key.isActive ? t("orgUsers.active") : t("orgUsers.inactive")}
                      </span>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleToggleActive(key._id, key.isActive)}
                        style={{ padding: "5px 15px", fontSize: "13px" }}
                      >
                        {key.isActive ? t("providerKeysManagement.disableButton") : t("providerKeysManagement.enableButton")}
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteKey(key._id, key.provider)}
                        style={{ padding: "5px 15px", fontSize: "13px" }}
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                  {key.createdAt && (
                    <p style={{ margin: "10px 0 0 0", fontSize: "12px", color: "#999" }}>
                      {t("providerKeysManagement.createdAtTimeLabel", { date: new Date(key.createdAt).toLocaleDateString("he-IL"), time: new Date(key.createdAt).toLocaleTimeString("he-IL") })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
      </div>

      {/* Add Key Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("providerKeysManagement.addNewKeyModalTitle")}</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleAddKey}>
              <div className="form-group">
                <label>{t("providerKeysManagement.providerLabel")}</label>
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
                <label>{t("providerKeysManagement.apiKeyRequiredLabel")}</label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  required
                  placeholder="sk-..."
                  style={{ fontFamily: "monospace" }}
                />
                <small style={{ display: "block", marginTop: "5px", color: "#666" }}>
                  {t("providerKeysManagement.keyWillBeEncrypted")}
                </small>
              </div>

              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  {t("providerKeysManagement.activeKeyCheckbox")}
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                >
                  {t("common.cancel")}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t("profileModal.buttonSaving") : t("providerKeysManagement.addKeyButton")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
