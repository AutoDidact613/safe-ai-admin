/**
 * client/src/features/agents/AgentSubmitPage.tsx
 *
 * Form to submit a new agent.
 * Flow: enter repo URL → fetch manifest → validate download_url → generate icon → submit
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchManifest, generateIcon, submitAgent } from "./api/agentsApi";
import type { AgentManifest } from "./types/agent.types";
import AgentIcon from "./AgentIcon";

type Step = "idle" | "loading-manifest" | "manifest-ready" | "generating-icon" | "submitting" | "done" | "error";

export default function AgentSubmitPage() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [manifest, setManifest] = useState<AgentManifest | null>(null);
  const [urlValid, setUrlValid] = useState<{ valid: boolean; error?: string } | null>(null);
  const [icon, setIcon] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleFetchManifest = async () => {
    if (!repoUrl.trim()) return;
    setStep("loading-manifest");
    setErrorMsg("");
    setManifest(null);
    setUrlValid(null);
    setIcon("");
    try {
      const res = await fetchManifest(repoUrl.trim());
      setManifest(res.manifest);
      setUrlValid(res.urlValidation);
      setStep("manifest-ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "שגיאה בטעינת ה-manifest");
      setStep("error");
    }
  };

  const handleGenerateIcon = async () => {
    if (!manifest) return;
    setStep("generating-icon");
    setErrorMsg("");
    try {
      const res = await generateIcon(manifest.name, manifest.description);
      setIcon(res.svg);
      setStep("manifest-ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "שגיאה ביצירת האייקון");
      setStep("manifest-ready"); // stay on manifest-ready, just show error
    }
  };

  const handleSubmit = async () => {
    if (!manifest || !urlValid?.valid) return;
    setStep("submitting");
    setErrorMsg("");
    try {
      await submitAgent(repoUrl.trim(), icon);
      setStep("done");
      setTimeout(() => navigate("/agents-marketplace"), 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "שגיאה בשליחת האייג'נט");
      setStep("manifest-ready");
    }
  };

  if (step === "done") {
    return (
      <div className="agent-submit-success">
        <span>✅</span>
        <h2>האייג'נט נשלח בהצלחה!</h2>
        <p>מעבירה אותך לגלריה...</p>
      </div>
    );
  }

  return (
    <div className="agent-submit-page">
      <h1>➕ הוסיפי אייג'נט חדש</h1>
      <p className="agent-submit-subtitle">
        הריפו חייב להכיל קובץ <code>manifest.json</code> בשורש הענף <code>main</code>
      </p>

      {/* Step 1: Repo URL */}
      <div className="agent-submit-section">
        <label>🔗 קישור ל-GitHub Repo (ציבורי)</label>
        <div className="agent-submit-row">
          <input
            type="url"
            className="agent-submit-input"
            placeholder="https://github.com/username/my-agent"
            value={repoUrl}
            onChange={(e) => { setRepoUrl(e.target.value); setStep("idle"); setManifest(null); }}
            disabled={step === "loading-manifest" || step === "submitting"}
          />
          <button
            className="agent-btn-primary"
            onClick={handleFetchManifest}
            disabled={!repoUrl.trim() || step === "loading-manifest"}
          >
            {step === "loading-manifest" ? "טוען..." : "🔍 טען manifest"}
          </button>
        </div>
      </div>

      {/* Error */}
      {errorMsg && <div className="agent-submit-error">❌ {errorMsg}</div>}

      {/* Step 2: Manifest preview */}
      {manifest && (
        <div className="agent-manifest-preview">
          <div className="agent-manifest-header">
            <span className="agent-manifest-ok">✅ manifest נטען בהצלחה</span>
          </div>

          <div className="agent-manifest-grid">
            <ManifestRow label="שם" value={manifest.name} />
            <ManifestRow label="יוצרת" value={manifest.creator_name} />
            <ManifestRow label="גרסה" value={manifest.version} />
            <ManifestRow label="תיאור" value={manifest.description} />
            {manifest.target_audience && (
              <ManifestRow label="קהל יעד" value={manifest.target_audience} />
            )}
          </div>

          {/* download_url validation */}
          <div className="agent-url-validation">
            <span>📦 קישור הורדה: <code>{manifest.download_url}</code></span>
            {urlValid && (
              <span className={urlValid.valid ? "validation-ok" : "validation-err"}>
                {urlValid.valid ? "✅ הקישור תקין" : `❌ ${urlValid.error}`}
              </span>
            )}
          </div>

          {/* Professional fields + tasks */}
          {manifest.professional_fields?.length > 0 && (
            <div className="agent-manifest-tags">
              {manifest.professional_fields.map((f) => (
                <span key={f} className="agent-badge agent-badge--field">{f}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Generate icon */}
      {manifest && (
        <div className="agent-submit-section">
          <label>🎨 אייקון לאייג'נט</label>

          {icon ? (
            <div className="agent-icon-preview-wrapper">
              <div className="agent-icon-preview">
                <AgentIcon svg={icon} />
              </div>
              <button
                className="agent-btn-secondary"
                onClick={handleGenerateIcon}
                disabled={step === "generating-icon"}
              >
                🔄 צרי אייקון חדש
              </button>
            </div>
          ) : (
            <button
              className="agent-btn-secondary"
              onClick={handleGenerateIcon}
              disabled={step === "generating-icon"}
            >
              {step === "generating-icon" ? "יוצרת אייקון..." : "🎨 צרי אייקון אוטומטי"}
            </button>
          )}
        </div>
      )}

      {/* Step 4: Submit */}
      {manifest && urlValid?.valid && (
        <div className="agent-submit-actions">
          <button
            className="agent-btn-primary agent-btn-submit"
            onClick={handleSubmit}
            disabled={step === "submitting"}
          >
            {step === "submitting" ? "שולחת..." : "📤 שלחי לאישור"}
          </button>
        </div>
      )}
    </div>
  );
}

function ManifestRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="agent-manifest-row">
      <span className="agent-manifest-label">{label}:</span>
      <span className="agent-manifest-value">{value}</span>
    </div>
  );
}
