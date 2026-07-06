import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function ApiKeyDisplay() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const proxyApiKey = location.state?.proxyApiKey;
  const message = location.state?.message;

  useEffect(() => {
    // If no API key in state, redirect to login
    if (!proxyApiKey) {
      navigate("/login");
    }
  }, [proxyApiKey, navigate]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(proxyApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob(
      [
        `SafeAI API Key\n\n`,
        `Key: ${proxyApiKey}\n\n`,
        `⚠️ IMPORTANT: Keep this key secure and never share it publicly.\n`,
        `This is the only time you will see this key.\n\n`,
        `Generated: ${new Date().toLocaleString("he-IL")}\n`,
      ],
      { type: "text/plain" },
    );
    element.href = URL.createObjectURL(file);
    element.download = `safeai-api-key-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setDownloaded(true);
  };

  const handleContinue = () => {
    navigate("/safeai-ui");
  };

  if (!proxyApiKey) {
    return null;
  }

  return (
    <div className="auth-form-container">
      <div className="auth-form-wrapper" style={{ maxWidth: "700px" }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h1 style={{ fontSize: "32px", marginBottom: "10px" }}>
            {t("apiKeyDisplay.successTitle")}
          </h1>
          {message && (
            <p style={{ color: "#666", fontSize: "14px" }}>{message}</p>
          )}
        </div>

        <div
          className="api-key-box"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "30px",
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
            {t("apiKeyDisplay.yourApiKeyLabel")}
          </p>
          <div
            dir="ltr"
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              fontFamily: "monospace",
              fontSize: "14px",
              wordBreak: "break-all",
              border: "3px solid #fff",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              textAlign: "left",
            }}
          >
            {proxyApiKey}
          </div>
        </div>

        <div
          className="alert alert-warning"
          style={{
            background: "#fff3cd",
            border: "2px solid #ffc107",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "25px",
          }}
        >
          <h3
            style={{ color: "#856404", marginBottom: "10px", fontSize: "18px" }}
          >
            ⚠️ {t("userApiKeys.importantTitle")}
          </h3>
          <ul style={{ margin: 0, paddingRight: "20px", color: "#856404" }}>
            <li>{t("userApiKeys.saveKeySafely")}</li>
            <li>
              <strong>{t("userApiKeys.lastChanceToSee")}</strong>
            </li>
            <li>{t("apiKeyDisplay.cannotRestoreKey")}</li>
            <li>{t("apiKeyDisplay.noShareWarning")}</li>
          </ul>
        </div>

        <div
          style={{
            display: "flex",
            gap: "15px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleCopy}
            className="btn btn-primary"
            style={{
              flex: 1,
              minWidth: "200px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {copied ? t("apiKeyDisplay.copiedBtn") : `📋 ${t("userApiKeys.copyToClipboardButton")}`}
          </button>
          <button
            onClick={handleDownload}
            className="btn btn-secondary"
            style={{
              flex: 1,
              minWidth: "200px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {downloaded ? t("apiKeyDisplay.downloadedBtn") : `💾 ${t("userApiKeys.downloadAsFileButton")}`}
          </button>
        </div>

        <div
          className="usage-instructions"
          style={{
            background: "#f8f9fa",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "25px",
          }}
        >
          <h3 style={{ marginBottom: "15px", fontSize: "18px" }}>
            {t("apiKeyDisplay.howToUseTitle")}
          </h3>
          <div style={{ fontSize: "14px", color: "#666" }}>
            <p style={{ marginBottom: "10px" }}>
              <strong>Python:</strong>
            </p>
            <pre
              style={{
                background: "#2d2d2d",
                color: "#f8f8f2",
                padding: "15px",
                borderRadius: "5px",
                overflow: "auto",
                fontSize: "12px",
                direction: "ltr"
              }}
            >
              {`from openai import OpenAI

client = OpenAI(
    api_key="${proxyApiKey}",
    base_url="http://your-domain.com/v1"
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)`}
            </pre>
          </div>
        </div>

        <button
          onClick={handleContinue}
          className="btn btn-primary btn-full"
          style={{ fontSize: "16px", padding: "15px" }}
        >
          {t("apiKeyDisplay.continueToDashboardBtn")}
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            fontSize: "12px",
            color: "#999",
          }}
        >
          {t("apiKeyDisplay.afterDashboardWarning")}
        </p>
      </div>
    </div>
  );
}
