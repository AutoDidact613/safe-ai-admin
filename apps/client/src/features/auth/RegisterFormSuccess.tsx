import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function RegisterFormSuccess() {
  const { t } = useTranslation();
  const [showAPIKey, setShowAPIKey] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get data from navigation state
  const { proxyApiKey, message, email } = location.state || {};

  return (
    <div className="auth-form-container">
      <div className="auth-form-wrapper" style={{ maxWidth: "700px" }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "32px", marginBottom: "10px" }}>
            {t("registerSuccess.title")}
          </h1>
        </div>

        <div
          className="alert alert-info"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "30px",
            borderRadius: "10px",
            marginBottom: "20px",
            color: "var(--text-inverse)",
          }}
        >
          <h2 style={{ fontSize: "24px", marginBottom: "15px", color: "var(--text-inverse)" }}>
            {t("registerSuccess.emailHeading")}
          </h2>
          <p style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "15px" }}>
            {message || t("registerSuccess.emailMessage")}
          </p>
          <p style={{ fontSize: "14px", marginBottom: "10px" }}>
            <strong>{t("registerSuccess.emailLabel")}</strong> {email}
          </p>
          <p style={{ fontSize: "14px", lineHeight: "1.5" }}>
            {t("registerSuccess.emailDescription")}
          </p>
        </div>

        {proxyApiKey && (
          <div
            className="alert alert-warning"
            style={{
              background: "var(--color-warning-bg)",
              border: "2px solid var(--color-warning-border)",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "25px",
            }}
          >
            <h3
              style={{ color: "var(--color-warning)", marginBottom: "10px", fontSize: "18px" }}
            >
              {t("registerSuccess.apiKeyWarningTitle")}
            </h3>
            <p style={{ color: "var(--color-warning)", marginBottom: "15px", fontSize: "14px" }}>
              {t("registerSuccess.apiKeyWarningDesc")}
            </p>
            <button
              onClick={() => setShowAPIKey(!showAPIKey)}
              className="btn btn-secondary"
              style={{ padding: "10px 20px" }}
            >
              {showAPIKey ? t("registerSuccess.buttonHideKey") : t("registerSuccess.buttonShowKey")}
            </button>
            
            {showAPIKey && (
              <div style={{ marginTop: "15px" }}>
                <div
                  style={{
                    background: "var(--bg-surface)",
                    padding: "20px",
                    borderRadius: "8px",
                    fontFamily: "monospace",
                    fontSize: "14px",
                    wordBreak: "break-all",
                    border: "2px solid var(--color-warning-border)",
                    boxShadow: "var(--shadow-md)",
                  }}
                >
                  {proxyApiKey}
                </div>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(proxyApiKey);
                      alert(t("registerSuccess.keyCopied"));
                    } catch (err) {
                      console.error("Failed to copy:", err);
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ marginTop: "10px", width: "100%" }}
                >
                  {t("registerSuccess.buttonCopyKey")}
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "30px" }}>
          <button
            onClick={() => navigate("/login")}
            className="btn btn-primary btn-full"
            style={{ fontSize: "16px", padding: "15px" }}
          >
            {t("registerSuccess.buttonLoginPage")}
          </button>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            fontSize: "12px",
            color: "var(--gray-400)",
          }}
        >
          {t("registerSuccess.noEmailFooter")}
        </p>
      </div>
    </div>
  );
}
