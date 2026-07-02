import { useState } from "react";
import { Link } from "react-router-dom";
import { publicRequestOrganization } from "./api/organizationApi";
import "../../styles/organizations-admin.css";

export const PublicOrgOwnerSignup = () => {
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName.trim() || !ownerEmail.trim() || !ownerPassword || !orgName.trim()) {
      setError("נא למלא את כל השדות המסומנים בכוכבית");
      return;
    }
    if (ownerPassword.length < 6) {
      setError("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await publicRequestOrganization({
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerPassword,
        orgName: orgName.trim(),
        orgDescription: orgDescription.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שליחת הבקשה נכשלה");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="orgs-admin-container">
        <div className="org-pending-card">
          <h2>הבקשה נשלחה! ⏳</h2>
          <p>
            בקשתך לפתיחת הארגון <strong>{orgName}</strong> נשלחה וממתינה לאישור מנהל המערכת.
          </p>
          <p>לאחר האישור תקבל/י מייל עם קישור להתחברות למערכת כמנהל/ת הארגון.</p>
          <Link to="/" className="org-detail-back">
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="orgs-admin-container">
      <h1 className="orgs-admin-title">הרשמה כמנהל/ת ארגון</h1>
      <p className="orgs-admin-subtitle">
        מלא/י את הפרטים שלך ושל הארגון. הבקשה תישלח לאישור מנהל המערכת, ותקבל/י הודעה
        במייל ברגע שהיא תאושר.
      </p>

      <form onSubmit={handleSubmit} className="org-request-form">
        <label className="org-field-label">שם מלא *</label>
        <input
          className="orgs-search"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          placeholder="שם מלא"
          required
        />

        <label className="org-field-label">אימייל *</label>
        <input
          type="email"
          className="orgs-search"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          placeholder="your@email.com"
          autoComplete="email"
          required
        />

        <label className="org-field-label">סיסמה *</label>
        <input
          type="password"
          className="orgs-search"
          value={ownerPassword}
          onChange={(e) => setOwnerPassword(e.target.value)}
          placeholder="לפחות 6 תווים"
          autoComplete="new-password"
          required
        />

        <label className="org-field-label">שם הארגון *</label>
        <input
          className="orgs-search"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="שם הארגון"
          required
        />

        <label className="org-field-label">תיאור הארגון (אופציונלי)</label>
        <textarea
          className="org-textarea"
          value={orgDescription}
          onChange={(e) => setOrgDescription(e.target.value)}
          rows={3}
          placeholder="תיאור קצר של הארגון"
        />

        {error && <div className="orgs-error">{error}</div>}

        <button type="submit" className="orgs-btn orgs-btn-activate" disabled={submitting}>
          {submitting ? "שולח..." : "שליחת בקשה"}
        </button>
      </form>
    </div>
  );
};