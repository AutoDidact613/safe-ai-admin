import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { API_ENDPOINTS, apiCall } from "../../config/api";

type AuthMode = "login" | "register";
type UserRole = "admin" | "user";

export default function AuthForm() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    organization: "",
    role: "user" as UserRole,
    mode: "BYOK" as "BYOK" | "MANAGED",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (authMode === "register") {
        // Registration
        const response = await apiCall<{ success: boolean; user: { _id: string; email: string; name: string; role: string; mode: string }; proxyApiKey: string }>(
          API_ENDPOINTS.users,
          {
            method: "POST",
            body: JSON.stringify({
              email: formData.email,
              name: formData.name,
              organization: formData.organization,
              role: formData.role,
              mode: formData.mode,
            }),
          }
        );

        if (response.success) {
          // Show the API key to the user
          alert(
            t("authForm.registrationSuccessAlert", { apiKey: response.proxyApiKey })
          );
          
          // Store user info in localStorage
          localStorage.setItem("user", JSON.stringify(response.user));
          localStorage.setItem("userRole", response.user.role);
          
          navigate("/safeai-ui");
        }
      } else {
        // Login - simulate login for admin
        if (formData.email === "admin@safeai.com" && formData.password === "admin123") {
          const adminUser = {
            _id: "admin-id",
            email: formData.email,
            name: "Admin User",
            role: "admin",
            mode: "MANAGED"
          };
          
          localStorage.setItem("user", JSON.stringify(adminUser));
          localStorage.setItem("userRole", "admin");
          
          navigate("/safeai-ui");
        } else {
          setError(t("authForm.invalidCredentialsError"));
        }
      }
    } catch (err: unknown) {
      console.error("Auth error:", err);
      const errorMessage = err instanceof Error ? err.message : t("authForm.genericErrorFallback");
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
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form-wrapper">
        <div className="auth-tabs">
          <button
            className={authMode === "login" ? "auth-tab active" : "auth-tab"}
            onClick={() => setAuthMode("login")}
          >
            {t("nav.login")}
          </button>
          <button
            className={authMode === "register" ? "auth-tab active" : "auth-tab"}
            onClick={() => setAuthMode("register")}
          >
            {t("nav.register")}
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {authMode === "register" && (
            <>
              <div className="form-group">
                <label htmlFor="name">{t("register.fullNameLabel")}</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder={t("register.fullNamePlaceholder")}
                />
              </div>

              <div className="form-group">
                <label htmlFor="organization">{t("authForm.organizationLabel")}</label>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  placeholder={t("authForm.organizationPlaceholder")}
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">{t("authForm.userTypeLabel")}</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid var(--border-default)" }}
                >
                  <option value="user">{t("authForm.roleUserOption")}</option>
                  <option value="admin">{t("authForm.roleAdminOption")}</option>
                </select>
                <small style={{ display: "block", marginTop: "5px", color: "var(--text-muted)" }}>
                  {formData.role === "admin"
                    ? t("authForm.roleAdminHint")
                    : t("authForm.roleUserHint")}
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="mode">{t("register.modeLabel")}</label>
                <select
                  id="mode"
                  name="mode"
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value as "BYOK" | "MANAGED" })}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid var(--border-default)" }}
                >
                  <option value="BYOK">{t("register.modeOptionByok")}</option>
                  <option value="MANAGED">{t("register.modeOptionManaged")}</option>
                </select>
                <small style={{ display: "block", marginTop: "5px", color: "var(--text-muted)" }}>
                  {formData.mode === "BYOK"
                    ? t("register.modeHintByok")
                    : t("register.modeHintManaged")}
                </small>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">{t("login.emailLabel")}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t("login.passwordLabel")}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder={t("login.passwordPlaceholder")}
              minLength={6}
            />
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "15px" }}>
              {error}
            </div>
          )}

          {authMode === "login" && (
            <div className="alert alert-info" style={{ marginBottom: "15px" }}>
              <strong>{t("authForm.demoNoticeLabel")}</strong>
              <br />
              {t("authForm.demoEmailPrefix")} admin@safeai.com
              <br />
              {t("authForm.demoPasswordPrefix")} admin123
            </div>
          )}

          {authMode === "register" && (
            <div className="form-info">
              <p>{t("register.termsText")}</p>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? t("authForm.processingBtn") : authMode === "login" ? t("resetPassword.loginLink") : t("register.submitButton")}
          </button>
        </form>

        <div className="auth-footer">
          {authMode === "login" ? (
            <p>
              {t("login.noAccountText")}{" "}
              <button
                className="link-button"
                onClick={() => setAuthMode("register")}
              >
                {t("login.registerNow")}
              </button>
            </p>
          ) : (
            <p>
              {t("register.haveAccountText")}{" "}
              <button
                className="link-button"
                onClick={() => setAuthMode("login")}
              >
                {t("resetPassword.loginLink")}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
