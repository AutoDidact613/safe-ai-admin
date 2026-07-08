import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall, API_ENDPOINTS } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push("הסיסמה חייבת להכיל לפחות 8 תווים");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("הסיסמה חייבת להכיל לפחות אות גדולה אחת");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("הסיסמה חייבת להכיל לפחות אות קטנה אחת");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("הסיסמה חייבת להכיל לפחות ספרה אחת");
    }
    return errors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === "newPassword" && passwordErrors.length > 0) {
      setPasswordErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPasswordErrors([]);

    if (formData.newPassword !== formData.confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      setLoading(false);
      return;
    }

    const errors = validatePassword(formData.newPassword);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      setLoading(false);
      return;
    }

    try {
      await apiCall<{ success: boolean; message: string }>(
        API_ENDPOINTS.auth.changePassword,
        {
          method: "POST",
          body: JSON.stringify({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
          }),
        }
      );

      if (user) {
        setUser({ ...user, mustChangePassword: false });
      }
      navigate(user?.profileId ? "/safeai-ui" : "/login");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "עדכון הסיסמה נכשל";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form-wrapper">
        <h2 className="auth-title">עדכון סיסמה נדרש</h2>

        <p style={{ textAlign: "center", color: "#666", marginBottom: "25px" }}>
          הסיסמה שקיבלת היא זמנית — יש להחליף אותה לפני המשך השימוש
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="currentPassword">סיסמה זמנית *</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">סיסמה חדשה *</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
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
            <label htmlFor="confirmPassword">אימות סיסמה *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "15px" }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? "מעדכן..." : "עדכן סיסמה"}
          </button>
        </form>
      </div>
    </div>
  );
}
