import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName.trim() || !ownerEmail.trim() || !ownerPassword || !orgName.trim()) {
      setError(t("organizations.signupRequiredFieldsError"));
      return;
    }
    if (ownerPassword.length < 6) {
      setError(t("organizations.signupPasswordMinLength"));
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
      setError(err instanceof Error ? err.message : t("organizations.signupFailedFallback"));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="orgs-admin-container">
        <div className="org-pending-card">
          <h2>{t("organizations.signupSuccessTitle")}</h2>
          <p>
            {t("organizations.signupSuccessPrefix")} <strong>{orgName}</strong> {t("organizations.signupSuccessSuffix")}
          </p>
          <p>{t("organizations.signupSuccessFooter")}</p>
          <Link to="/" className="org-detail-back">
            {t("organizations.backToHomeLink")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="orgs-admin-container">
      <h1 className="orgs-admin-title">{t("organizations.signupTitle")}</h1>
      <p className="orgs-admin-subtitle">
        {t("organizations.signupSubtitle")}
      </p>

      <form onSubmit={handleSubmit} className="org-request-form">
        <label className="org-field-label">{t("register.fullNameLabel")}</label>
        <input
          className="orgs-search"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          placeholder={t("orgUsers.fullNamePlaceholder")}
          required
        />

        <label className="org-field-label">{t("register.emailLabel")}</label>
        <input
          type="email"
          className="orgs-search"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          placeholder="your@email.com"
          autoComplete="email"
          required
        />

        <label className="org-field-label">{t("register.passwordLabel")}</label>
        <input
          type="password"
          className="orgs-search"
          value={ownerPassword}
          onChange={(e) => setOwnerPassword(e.target.value)}
          placeholder={t("organizations.passwordMinCharsPlaceholder")}
          autoComplete="new-password"
          required
        />

        <label className="org-field-label">{t("organizations.orgNameLabel")}</label>
        <input
          className="orgs-search"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder={t("orgUsers.orgNamePlaceholder")}
          required
        />

        <label className="org-field-label">{t("organizations.orgDescriptionLabel")}</label>
        <textarea
          className="org-textarea"
          value={orgDescription}
          onChange={(e) => setOrgDescription(e.target.value)}
          rows={3}
          placeholder={t("organizations.orgDescriptionShortPlaceholder")}
        />

        {error && <div className="orgs-error">{error}</div>}

        <button type="submit" className="orgs-btn orgs-btn-activate" disabled={submitting}>
          {submitting ? t("forgotPassword.sendingBtn") : t("organizations.submitRequestBtn")}
        </button>
      </form>
    </div>
  );
};