import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [testText, setTestText] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProfileId || !testText.trim()) {
      setError(t("profileTester.validationRequired"));
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
      const errorMessage = err instanceof Error ? err.message : t("usersManagement.errorUnknown");
      setError(t("profileTester.testErrorPrefix", { message: errorMessage }));
    } finally {
      setTesting(false);
    }
  };

  const getReasonText = (reason: string) => {
    const reasons: Record<string, string> = {
      "blocked-category": t("profileTester.reasonBlockedCategory"),
      "passed-vector": t("profileTester.reasonPassedVector"),
      "allowed-by-llm": t("profileTester.reasonAllowedByLlm"),
      "blocked-by-llm": t("profileTester.reasonBlockedByLlm"),
      "low-confidence": t("profileTester.reasonLowConfidence"),
    };
    return reasons[reason] || reason;
  };

  const selectedProfile = profiles.find((p) => p._id === selectedProfileId);

  return (
    <div style={{ 
      backgroundColor: "var(--bg-elevated)",
      padding: "20px", 
      borderRadius: "8px",
      marginBottom: "30px"
    }}>
      <h3 style={{ marginTop: 0, marginBottom: "20px" }}>🧪 {t("profileTester.title")}</h3>

      <form onSubmit={handleTest}>
        <div className="form-group">
          <label>{t("profileTester.selectProfileLabel")}</label>
          <select
            value={selectedProfileId}
            onChange={(e) => {
              setSelectedProfileId(e.target.value);
              setResult(null);
              setError(null);
            }}
            required
          >
            <option value="">{t("profileModal.selectPlaceholder")}</option>
            {profiles.map((profile) => (
              <option key={profile._id} value={profile._id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>{t("profileTester.testTextLabel")}</label>
          <textarea
            value={testText}
            onChange={(e) => {
              setTestText(e.target.value);
              setResult(null);
              setError(null);
            }}
            placeholder={t("profileTester.testTextPlaceholder")}
            rows={4}
            required
            style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid var(--border-default)" }}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={testing || !selectedProfileId || !testText.trim()}
          style={{ width: "100%" }}
        >
          {testing ? t("profileTester.testingButton") : `🔍 ${t("profileTester.testButton")}`}
        </button>
      </form>

      {error && (
        <div style={{
          marginTop: "20px",
          padding: "15px",
          backgroundColor: "var(--color-danger-bg)",
          border: "1px solid var(--color-danger-border)",
          borderRadius: "4px",
          color: "var(--color-danger)"
        }}>
          <strong>❌ {t("statistics.errorLabel")}</strong> {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: "20px",
          padding: "20px",
          backgroundColor: result.allowed ? "var(--color-success-bg)" : "var(--color-danger-bg)",
          border: `2px solid ${result.allowed ? "var(--color-success)" : "var(--color-danger)"}`,
          borderRadius: "8px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
            <span style={{ fontSize: "32px" }}>
              {result.allowed ? "✅" : "🚫"}
            </span>
            <div>
              <h4 style={{ margin: 0, color: result.allowed ? "var(--color-success)" : "var(--color-danger)" }}>
                {result.allowed ? t("profileTester.textApprovedTitle") : t("profileTester.textBlockedTitle")}
              </h4>
              <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: result.allowed ? "var(--color-success)" : "var(--color-danger)" }}>
                {t("usersManagement.profileLabel")} <strong>{selectedProfile?.name}</strong>
              </p>
            </div>
          </div>

          <div style={{ 
            padding: "10px", 
            backgroundColor: "rgba(255,255,255,0.5)", 
            borderRadius: "4px",
            fontSize: "14px"
          }}>
            <strong>{t("profileTester.reasonLabel")}</strong> {getReasonText(result.reason)}
          </div>

          <div style={{
            marginTop: "15px",
            padding: "10px",
            backgroundColor: "rgba(255,255,255,0.3)",
            borderRadius: "4px",
            fontSize: "13px",
            fontFamily: "monospace"
          }}>
            <strong>{t("profileTester.testedTextLabel")}</strong>
            <div style={{ marginTop: "5px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              "{testText}"
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
