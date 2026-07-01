import { useState } from "react";
import { requestOrganization } from "./api/organizationApi";
import "../../styles/organizations-admin.css";

export const OrganizationRequestForm = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      setError(null);
      await requestOrganization({ name: name.trim(), description: description.trim() });
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
          <p>בקשתך לפתיחת הארגון נשלחה וממתינה לאישור מנהל המערכת.</p>
          <p>לאחר האישור תקבל/י מייל וגישה מלאה לניהול הארגון.</p>
          <p style={{ color: "#666", fontSize: 14 }}>
            כדי לראות את מסך "ממתין לאישור", ייתכן שתצטרך/י להתנתק ולהתחבר מחדש.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="orgs-admin-container">
      <h1 className="orgs-admin-title">פתיחת ארגון חדש</h1>
      <p className="orgs-admin-subtitle">מלא/י את הפרטים כדי לשלוח בקשה לפתיחת ארגון. הבקשה תמתין לאישור מנהל.</p>

      <form onSubmit={handleSubmit} className="org-request-form">
        <label className="org-field-label">שם הארגון *</label>
        <input className="orgs-search" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="שם הארגון" required />

        <label className="org-field-label">תיאור (אופציונלי)</label>
        <textarea className="org-textarea" value={description}
          onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="תיאור קצר של הארגון" />

        {error && <div className="orgs-error">{error}</div>}

        <button type="submit" className="orgs-btn orgs-btn-activate" disabled={submitting}>
          {submitting ? "שולח..." : "שליחת בקשה"}
        </button>
      </form>
    </div>
  );
};
