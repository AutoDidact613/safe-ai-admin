import { useState } from "react";
import { API_ENDPOINTS, apiCall } from "../../config/api";

interface Profile {
  _id: string;
  name: string;
}

interface EvaluateResponse {
  allowed: boolean;
  reason: string;
}

interface ProfileTesterProps {
  profiles: Profile[];
}

export default function ProfileTester({ profiles }: ProfileTesterProps) {
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [testText, setTestText] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProfileId || !testText.trim()) {
      setError("יש לבחור פרופיל ולהזין טקסט לבדיקה");
      return;
    }

    setTesting(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiCall<EvaluateResponse>(`${API_ENDPOINTS.filter}/evaluate`, {
        method: "POST",
        body: JSON.stringify({
          profileId: selectedProfileId,
          text: testText,
          auditDisabled: true, // Don't save test queries to logs
        }),
      });

      setResult(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "שגיאה לא ידועה";
      setError(`שגיאה בבדיקת הטקסט: ${errorMessage}`);
    } finally {
      setTesting(false);
    }
  };

  const getReasonText = (reason: string) => {
    const reasons: Record<string, string> = {
      "blocked-category": "נחסם על ידי קטגוריה חסומה",
      "passed-vector": "עבר בדיקת וקטורים",
      "allowed-by-llm": "אושר על ידי מודל השפה",
      "blocked-by-llm": "נחסם על ידי מודל השפה",
      "low-confidence": "רמת ביטחון נמוכה",
    };
    return reasons[reason] || reason;
  };

  const selectedProfile = profiles.find((p) => p._id === selectedProfileId);

  return (
    <div style={{ 
      backgroundColor: "#f8f9fa", 
      padding: "20px", 
      borderRadius: "8px",
      marginBottom: "30px"
    }}>
      <h3 style={{ marginTop: 0, marginBottom: "20px" }}>🧪 בדיקת פרופיל</h3>
      
      <form onSubmit={handleTest}>
        <div className="form-group">
          <label>בחר פרופיל לבדיקה *</label>
          <select
            value={selectedProfileId}
            onChange={(e) => {
              setSelectedProfileId(e.target.value);
              setResult(null);
              setError(null);
            }}
            required
          >
            <option value="">-- בחר פרופיל --</option>
            {profiles.map((profile) => (
              <option key={profile._id} value={profile._id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>טקסט לבדיקה *</label>
          <textarea
            value={testText}
            onChange={(e) => {
              setTestText(e.target.value);
              setResult(null);
              setError(null);
            }}
            placeholder="הזן טקסט כדי לבדוק אם הוא יעבור או ייחסם על ידי הפרופיל..."
            rows={4}
            required
            style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={testing || !selectedProfileId || !testText.trim()}
          style={{ width: "100%" }}
        >
          {testing ? "בודק..." : "🔍 בדוק טקסט"}
        </button>
      </form>

      {error && (
        <div style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "#f8d7da",
          border: "1px solid #f5c6cb",
          borderRadius: "4px",
          color: "#721c24"
        }}>
          <strong>❌ שגיאה:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: "20px",
          padding: "20px",
          backgroundColor: result.allowed ? "#d4edda" : "#f8d7da",
          border: `2px solid ${result.allowed ? "#28a745" : "#dc3545"}`,
          borderRadius: "8px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
            <span style={{ fontSize: "32px" }}>
              {result.allowed ? "✅" : "🚫"}
            </span>
            <div>
              <h4 style={{ margin: 0, color: result.allowed ? "#155724" : "#721c24" }}>
                {result.allowed ? "טקסט מאושר" : "טקסט חסום"}
              </h4>
              <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: result.allowed ? "#155724" : "#721c24" }}>
                פרופיל: <strong>{selectedProfile?.name}</strong>
              </p>
            </div>
          </div>

          <div style={{ 
            padding: "10px", 
            backgroundColor: "rgba(255,255,255,0.5)", 
            borderRadius: "4px",
            fontSize: "14px"
          }}>
            <strong>סיבה:</strong> {getReasonText(result.reason)}
          </div>

          <div style={{
            marginTop: "15px",
            padding: "10px",
            backgroundColor: "rgba(255,255,255,0.3)",
            borderRadius: "4px",
            fontSize: "13px",
            fontFamily: "monospace"
          }}>
            <strong>טקסט שנבדק:</strong>
            <div style={{ marginTop: "5px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              "{testText}"
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
