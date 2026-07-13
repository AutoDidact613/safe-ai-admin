import { useState, useEffect } from "react";
import ProviderKeysManagement from "./ProviderKeysManagement";
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

interface ProxyKeyInfo {
  proxyKeyPrefix: string;
  isActive: boolean;
  createdAt?: string;
  litellmPrefix: string;
}

export default function UserApiKeysPage() {
  const [user, setUser] = useState<{ _id: string; email: string; name: string; role: string; mode: string } | null>(null);
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [proxyKey, setProxyKey] = useState<ProxyKeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [proxyKeyLoading, setProxyKeyLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNewProxyKey, setShowNewProxyKey] = useState(false);
  const [newProxyKey, setNewProxyKey] = useState<string>("");

  useEffect(() => {
    // Load user from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchKeys(parsedUser._id);
      fetchProxyKey();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchKeys = async (userId: string) => {
    try {
      const allKeys = await apiCall<ProviderKey[]>(API_ENDPOINTS.providerKeys);
      const userKeys = allKeys.filter(key => key.userId === userId);
      setKeys(userKeys);
    } catch (error) {
      console.error("Failed to fetch provider keys:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProxyKey = async () => {
    try {
      const keyInfo = await apiCall<ProxyKeyInfo>(API_ENDPOINTS.proxyKey.info);
      setProxyKey(keyInfo);
    } catch (error) {
      console.error("Failed to fetch proxy key:", error);
    }
  };

  const handleToggleProxyKey = async () => {
    if (!proxyKey) return;
    
    setProxyKeyLoading(true);
    try {
      const result = await apiCall<{ success: boolean; keyInfo: ProxyKeyInfo }>(
        API_ENDPOINTS.proxyKey.toggle,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: !proxyKey.isActive }),
        }
      );
      
      if (result.success) {
        setProxyKey(result.keyInfo);
        alert(result.keyInfo.isActive ? "המפתח הופעל בהצלחה" : "המפתח הושבת בהצלחה");
      }
    } catch (error) {
      console.error("Failed to toggle proxy key:", error);
      alert("שגיאה בשינוי סטטוס המפתח");
    } finally {
      setProxyKeyLoading(false);
    }
  };

  const handleRegenerateProxyKey = async () => {
    const confirmed = confirm(
      "האם אתה בטוח שברצונך ליצור מפתח חדש?\n\n" +
      "⚠️ המפתח הישן יפסיק לעבוד מיד!\n" +
      "זו ההזדמנות האחרונה שלך לראות את המפתח החדש."
    );
    
    if (!confirmed) return;
    
    setProxyKeyLoading(true);
    try {
      const result = await apiCall<{ 
        success: boolean; 
        proxyApiKey: string; 
        keyInfo: ProxyKeyInfo;
        message: string;
      }>(
        API_ENDPOINTS.proxyKey.regenerate,
        {
          method: "POST",
        }
      );
      
      if (result.success) {
        setProxyKey(result.keyInfo);
        setNewProxyKey(result.proxyApiKey);
        setShowNewProxyKey(true);
      }
    } catch (error) {
      console.error("Failed to regenerate proxy key:", error);
      alert("שגיאה ביצירת מפתח חדש");
    } finally {
      setProxyKeyLoading(false);
    }
  };

  const handleCopyProxyKey = async () => {
    try {
      await navigator.clipboard.writeText(newProxyKey);
      alert("המפתח הועתק ללוח!");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownloadProxyKey = () => {
    const element = document.createElement("a");
    const file = new Blob(
      [
        `SafeAI Proxy API Key\n\n`,
        `Key: ${newProxyKey}\n\n`,
        `⚠️ IMPORTANT: Keep this key secure and never share it publicly.\n`,
        `This is the only time you will see this key.\n\n`,
        `Generated: ${new Date().toLocaleString("he-IL")}\n`,
      ],
      { type: "text/plain" }
    );
    element.href = URL.createObjectURL(file);
    element.download = `safeai-proxy-key-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return <div className="loading-state">טוען...</div>;
  }

  if (!user) {
    return (
      <div className="empty-state">
        <h2>לא מחובר</h2>
        <p>אנא התחבר כדי לנהל מפתחות API</p>
      </div>
    );
  }

  return (
    <div>
      <div className="management-header">
        <div>
          <h2>🔑 ניהול מפתחות API</h2>
          <p style={{ margin: "10px 0 0 0", color: "#666" }}>
            שלום {user.name} ({user.email})
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span className={`badge ${user.mode === "BYOK" ? "badge-primary" : "badge-secondary"}`}>
            {user.mode === "BYOK" ? "🔑 BYOK" : "🏢 MANAGED"}
          </span>
          <span className={`badge ${user.role === "admin" ? "badge-warning" : "badge-info"}`}>
            {user.role === "admin" ? "👑 מנהל" : "👤 משתמש"}
          </span>
        </div>
      </div>

      {/* Proxy API Key Section - Always visible for all users */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3>🔐 מפתח Proxy API שלי</h3>
        </div>

        {proxyKey ? (
          <div>
            <div
              style={{
                border: "2px solid #667eea",
                borderRadius: "8px",
                padding: "20px",
                backgroundColor: proxyKey.isActive ? "#f8f9ff" : "#f5f5f5",
                marginBottom: "15px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <div>
                  <h4 style={{ margin: 0, marginBottom: "5px" }}>מפתח הגישה שלך למערכת</h4>
                  <p style={{ margin: 0, fontSize: "14px", color: "#666", fontFamily: "monospace" }}>
                    {proxyKey.proxyKeyPrefix}...
                  </p>
                </div>
                <span className={proxyKey.isActive ? "badge badge-success" : "badge badge-secondary"}>
                  {proxyKey.isActive ? "✅ פעיל" : "⏸️ מושבת"}
                </span>
              </div>

              {proxyKey.createdAt && (
                <p style={{ margin: "0 0 15px 0", fontSize: "12px", color: "#999" }}>
                  נוצר: {new Date(proxyKey.createdAt).toLocaleDateString("he-IL")}
                </p>
              )}

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  className={proxyKey.isActive ? "btn btn-secondary" : "btn btn-success"}
                  onClick={handleToggleProxyKey}
                  disabled={proxyKeyLoading}
                  style={{ flex: "1", minWidth: "150px" }}
                >
                  {proxyKeyLoading ? "⏳ מעבד..." : proxyKey.isActive ? "⏸️ השבת מפתח" : "▶️ הפעל מפתח"}
                </button>
                <button
                  className="btn btn-warning"
                  onClick={handleRegenerateProxyKey}
                  disabled={proxyKeyLoading}
                  style={{ flex: "1", minWidth: "150px" }}
                >
                  {proxyKeyLoading ? "⏳ מעבד..." : "🔄 צור מפתח חדש"}
                </button>
              </div>
            </div>

            <div className="alert alert-info" style={{ fontSize: "13px" }}>
              <strong>💡 טיפ:</strong> השתמש במפתח זה כדי לגשת ל-API של SafeAI מהקוד שלך.
              אם שכחת את המפתח, תוכל ליצור אחד חדש (המפתח הישן יפסיק לעבוד).
            </div>
          </div>
        ) : (
          <div className="loading-state">טוען מידע על מפתח...</div>
        )}
      </div>

      {user.mode === "BYOK" ? (
        <>
          <div className="alert alert-info" style={{ marginBottom: "20px" }}>
            <strong>ℹ️ מצב BYOK (Bring Your Own Key)</strong>
            <p style={{ margin: "10px 0 0 0" }}>
              במצב זה, אתה מוסיף מפתחות API משלך לספקים שונים (OpenAI, Anthropic, Google, Groq).
              המפתחות מוצפנים ונשמרים בצורה מאובטחת במערכת.
            </p>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3>המפתחות שלי ({keys.length})</h3>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowAddModal(true)}
              >
                + הוסף מפתח חדש
              </button>
            </div>

            {keys.length === 0 ? (
              <div className="empty-state">
                <p>עדיין לא הוספת מפתחות API</p>
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
                        <span style={{ fontSize: "24px" }}>
                          {key.provider === "openai" ? "🤖" : 
                           key.provider === "anthropic" ? "🧠" : 
                           key.provider === "google" ? "🔍" : "⚡"}
                        </span>
                        <div>
                          <h4 style={{ margin: 0 }}>
                            {key.provider === "openai" ? "OpenAI" : 
                             key.provider === "anthropic" ? "Anthropic (Claude)" : 
                             key.provider === "google" ? "Google (Gemini)" : "Groq"}
                          </h4>
                          <p style={{ margin: "5px 0 0 0", fontSize: "13px", color: "#666", fontFamily: "monospace" }}>
                            {key.keyPrefix}...
                          </p>
                        </div>
                      </div>
                      <span className={key.isActive ? "badge badge-success" : "badge badge-secondary"}>
                        {key.isActive ? "פעיל" : "לא פעיל"}
                      </span>
                    </div>
                    {key.createdAt && (
                      <p style={{ margin: "10px 0 0 0", fontSize: "12px", color: "#999" }}>
                        נוצר: {new Date(key.createdAt).toLocaleDateString("he-IL")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="alert alert-info">
          <strong>🏢 מצב MANAGED</strong>
          <p style={{ margin: "10px 0 0 0" }}>
            במצב זה, המערכת מנהלת את המפתחות עבורך. אין צורך להוסיף מפתחות משלך.
          </p>
        </div>
      )}

      {showAddModal && user && (
        <ProviderKeysManagement
          userId={user._id}
          userEmail={user.email}
          onClose={() => {
            setShowAddModal(false);
            fetchKeys(user._id);
          }}
        />
      )}

      {/* Modal for displaying new proxy key */}
      {showNewProxyKey && newProxyKey && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setShowNewProxyKey(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "30px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: "20px", textAlign: "center" }}>
              🎉 המפתח החדש נוצר בהצלחה!
            </h2>

            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                padding: "25px",
                borderRadius: "10px",
                marginBottom: "20px",
              }}
            >
              <p
                style={{
                  color: "white",
                  marginBottom: "15px",
                  fontWeight: "bold",
                  fontSize: "16px",
                }}
              >
                מפתח ה-Proxy API החדש שלך:
              </p>
              <div
                style={{
                  background: "white",
                  padding: "15px",
                  borderRadius: "8px",
                  fontFamily: "monospace",
                  fontSize: "13px",
                  wordBreak: "break-all",
                  border: "3px solid #fff",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              >
                {newProxyKey}
              </div>
            </div>

            <div
              className="alert alert-warning"
              style={{
                background: "#fff3cd",
                border: "2px solid #ffc107",
                borderRadius: "8px",
                padding: "15px",
                marginBottom: "20px",
              }}
            >
              <h4 style={{ color: "#856404", marginTop: 0, marginBottom: "10px" }}>
                ⚠️ חשוב מאוד!
              </h4>
              <ul style={{ margin: 0, paddingRight: "20px", color: "#856404" }}>
                <li>שמור מפתח זה במקום בטוח</li>
                <li>
                  <strong>זו ההזדמנות האחרונה שלך לראות אותו!</strong>
                </li>
                <li>לא תוכל לשחזר את המפתח אחרי סגירת חלון זה</li>
                <li>המפתח הישן כבר לא עובד</li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
              <button
                onClick={handleCopyProxyKey}
                className="btn btn-primary"
                style={{ flex: 1, minWidth: "150px" }}
              >
                📋 העתק ללוח
              </button>
              <button
                onClick={handleDownloadProxyKey}
                className="btn btn-secondary"
                style={{ flex: 1, minWidth: "150px" }}
              >
                💾 הורד כקובץ
              </button>
            </div>

            <button
              onClick={() => setShowNewProxyKey(false)}
              className="btn btn-primary btn-full"
              style={{ width: "100%" }}
            >
              סגור ← (לא אוכל לראות את המפתח שוב)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
