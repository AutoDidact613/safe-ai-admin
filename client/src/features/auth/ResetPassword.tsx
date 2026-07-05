import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiCall, API_ENDPOINTS } from "../../config/api";

export default function ResetPassword() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      setError(t("resetPassword.invalidToken"));
    }
  }, [token, t]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push(t("resetPassword.errorMinLength"));
    }
    if (!/[A-Z]/.test(password)) {
      errors.push(t("resetPassword.errorUppercase"));
    }
    if (!/[a-z]/.test(password)) {
      errors.push(t("resetPassword.errorLowercase"));
    }
    if (!/[0-9]/.test(password)) {
      errors.push(t("resetPassword.errorDigit"));
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPasswordErrors([]);

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setError(t("resetPassword.errorMatch"));
      setLoading(false);
      return;
    }

    // Validate password strength
    const errors = validatePassword(formData.newPassword);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      setLoading(false);
      return;
    }

    if (!token) {
      setError(t("resetPassword.invalidToken"));
      setLoading(false);
      return;
    }

    try {
      const response = await apiCall<{
        success: boolean;
        message: string;
      }>(API_ENDPOINTS.auth.resetPassword, {
        method: "POST",
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
        }),
      });

      if (response.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (err: unknown) {
      console.error("Reset password error:", err);
      const errorMessage =
        err instanceof Error ? err.message : t("resetPassword.errorResetFailed");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    // Clear password errors when user types
    if (e.target.name === "newPassword" && passwordErrors.length > 0) {
      setPasswordErrors([]);
    }
  };

  if (success) {
    return (
      <div className="auth-form-container">
        <div className="auth-form-wrapper">
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div
              style={{
                fontSize: "64px",
                marginBottom: "20px",
              }}
            >
              ✅
            </div>
            <h2 style={{ color: "#28a745", marginBottom: "15px" }}>
              {t("resetPassword.successTitle")}
            </h2>
            <p style={{ color: "#666", marginBottom: "20px" }}>
              {t("resetPassword.successDesc")}
            </p>
            <p style={{ color: "#999", fontSize: "14px" }}>
              {t("resetPassword.redirectingMsg")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form-container">
      <div className="auth-form-wrapper">
        <h2 className="auth-title">{t("resetPassword.title")}</h2>

        <p style={{ textAlign: "center", color: "#666", marginBottom: "25px" }}>
          {t("resetPassword.subtitle")}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="newPassword">{t("resetPassword.newPasswordLabel")}</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
              placeholder={t("resetPassword.newPasswordPlaceholder")}
              autoComplete="new-password"
            />
            {passwordErrors.length > 0 && (
              <div className="password-requirements">
                <ul>
                  {passwordErrors.map((err, idx) => (
                    <li key={idx} style={{ color: "#dc3545", fontSize: "12px" }}>
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t("resetPassword.confirmPasswordLabel")}</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder={t("resetPassword.confirmPasswordPlaceholder")}
              autoComplete="new-password"
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
            disabled={loading || !token}
          >
            {loading ? t("resetPassword.buttonSubmitting") : t("resetPassword.buttonSubmit")}
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
      </div>
    </div>
  );
}
