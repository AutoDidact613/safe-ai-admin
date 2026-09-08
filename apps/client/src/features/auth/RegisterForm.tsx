import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { apiCall, API_ENDPOINTS } from "../../config/api";
import { AUTH_ERROR_CODE_KEYS } from "../../i18n/authErrorCodes";

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  organizationId: string;
  profileId?: string;
  mode: "BYOK" | "MANAGED";
}

interface Organization {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
  mode: string;
  profileId?: string;
}

export default function RegisterForm() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<RegisterFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    organizationId: "6a00e26b1e9d916a4da16fd7", // Default to SafeAI organization
    profileId: "",
    mode: "BYOK",
  });
  const [organizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [agreedToPrivacyPolicy, setAgreedToPrivacyPolicy] = useState(false);
  const navigate = useNavigate();

  // Fetch organizations on component mount
  useEffect(() => {
    // const fetchOrganizations = async () => {
    //   try {
    //     const response = await apiCall<Organization[]>(
    //       API_ENDPOINTS.organizations,
    //       {
    //         method: "GET",
    //       }
    //     );
    //     setOrganizations(response.filter((org) => org.isActive));
    //   } catch (err) {
    //     console.error("Failed to fetch organizations:", err);
    //     // Don't show error to user - organization selection is optional
    //   }
    // };
    // fetchOrganizations();
  }, []);

  const validateEmail = (email: string): string | null => {
    if (email.includes("+")) {
      return 'לא ניתן להשתמש בתו "+" בכתובת המייל';
    }
    return null;
  };

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
    setEmailError(null);

    // Validate email
    const emailValidationError = validateEmail(formData.email);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      setLoading(false);
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError(t("resetPassword.errorMatch"));
      setLoading(false);
      return;
    }

    // Validate password strength
    const errors = validatePassword(formData.password);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      setLoading(false);
      return;
    }

    if (!agreedToPrivacyPolicy) {
      setError("יש לאשר את מדיניות הפרטיות כדי להירשם");
      setLoading(false);
      return;
    }

    try {
      const response = await apiCall<{
        success: boolean;
        message: string;
        user: User;
        proxyApiKey: string;
      }>(API_ENDPOINTS.auth.register, {
        method: "POST",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          organizationId: formData.organizationId || undefined,
          profileId: formData.profileId || undefined,
          mode: formData.mode,
        }),
      });

      if (response.success) {
        // Don't store tokens - user must verify email first
        // Navigate to success page with API key and verification message
        navigate("/register-success", {
          state: {
            proxyApiKey: response.proxyApiKey,
            message: response.message,
            email: formData.email,
          },
        });
      }
    } catch (err: unknown) {
      console.error("Registration error:", err);
      const code = (err as { code?: string })?.code;
      const key = code ? AUTH_ERROR_CODE_KEYS[code] : undefined;
      setError(key ? t(key) : t("register.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear password errors when user types
    if (name === "password" && passwordErrors.length > 0) {
      setPasswordErrors([]);
    }

    if (name === "email") {
      setEmailError(validateEmail(value));
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form-wrapper">
        <h2 className="auth-title">{t("nav.register")}</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
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
            <label htmlFor="email">{t("register.emailLabel")}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
              autoComplete="email"
            />
            {emailError && (
              <span style={{ color: "#dc3545", fontSize: "12px" }}>{emailError}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">{t("register.passwordLabel")}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder={t("login.passwordPlaceholder")}
              autoComplete="new-password"
            />
            {passwordErrors.length > 0 && (
              <div className="password-requirements">
                <ul>
                  {passwordErrors.map((err, idx) => (
                    <li key={idx} style={{ color: "var(--color-danger)", fontSize: "12px" }}>
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

          <div className="form-group">
            <label htmlFor="organizationId">{t("register.organizationLabel")}</label>
            <select
              id="organizationId"
              name="organizationId"
              value={formData.organizationId}
              onChange={handleChange}
              required
            >
                <option value="6a00e26b1e9d916a4da16fd7">SafeAI</option>

              {organizations.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name}
                </option>
              ))}
            </select>
            <small style={{ display: "block", marginTop: "5px", color: "var(--text-muted)" }}>
              {t("register.organizationHint")}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="mode">{t("register.modeLabel")}</label>
            <select
              id="mode"
              name="mode"
              value={formData.mode}
              onChange={handleChange}
              required
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

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "15px" }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              <input
                type="checkbox"
                checked={agreedToPrivacyPolicy}
                onChange={(e) => setAgreedToPrivacyPolicy(e.target.checked)}
                required
                style={{
                  width: "16px",
                  height: "16px",
                  padding: 0,
                  margin: 0,
                  flexShrink: 0,
                  border: "1px solid var(--border-default)",
                  borderRadius: "3px",
                  background: "var(--bg-surface)",
                  accentColor: "var(--brand-secondary)",
                }}
              />
              <span>
                קראתי ואני מסכימ/ה ל{" "}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer">
                  מדיניות הפרטיות
                </Link>
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || !agreedToPrivacyPolicy}
          >
            {loading ? t("register.submitLoading") : t("register.submitButton")}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {t("register.haveAccountText")}{" "}
            <button className="link-button" onClick={() => navigate("/login")}>
              {t("contact.loginButton")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
