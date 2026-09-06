import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiCall, API_ENDPOINTS } from "../../config/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiCall<{
        success: boolean;
        message: string;
      }>(API_ENDPOINTS.auth.forgotPassword, {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      if (response.success) {
        setSuccess(true);
      }
    } catch (err: unknown) {
      console.error("Forgot password error:", err);
      const errorMessage =
        err instanceof Error ? err.message : t("forgotPassword.errorFallback");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form-wrapper">
        <h2 className="auth-title">{t("login.forgotPassword")}</h2>

        {!success ? (
          <>
            <p style={{ textAlign: "center", color: "var(--text-muted)", marginBottom: "25px" }}>
              {t("forgotPassword.subtitle")}
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">{t("login.emailLabel")}</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: "15px" }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? t("forgotPassword.sendingBtn") : t("forgotPassword.sendLinkBtn")}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                {t("resetPassword.forgotPasswordLink")}{" "}
                <button
                  className="link-button"
                  onClick={() => navigate("/login")}
                >
                  {t("resetPassword.loginLink")}
                </button>
              </p>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <div
              style={{
                fontSize: "64px",
                marginBottom: "20px",
              }}
            >
              ✉️
            </div>
            <h3 style={{ color: "var(--color-success)", marginBottom: "15px" }}>
              {t("forgotPassword.successTitle")}
            </h3>
            <p style={{ color: "var(--text-muted)", marginBottom: "20px" }}>
              {t("forgotPassword.successMessage")}
              <br />
              {t("forgotPassword.checkInboxMessage")}
            </p>
            <button
              onClick={() => navigate("/login")}
              className="btn btn-primary"
            >
              {t("emailVerification.backToLoginBtn")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
