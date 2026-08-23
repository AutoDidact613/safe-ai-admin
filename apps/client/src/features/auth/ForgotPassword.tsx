import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiCall, API_ENDPOINTS } from "../../config/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
        err instanceof Error ? err.message : "שגיאה בשליחת בקשת איפוס סיסמה";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form-wrapper">
        <h2 className="auth-title">שכחתי סיסמה</h2>

        {!success ? (
          <>
            <p style={{ textAlign: "center", color: "#666", marginBottom: "25px" }}>
              הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">אימייל</label>
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
                {loading ? "שולח..." : "שלח קישור לאיפוס סיסמה"}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                נזכרת בסיסמה?{" "}
                <button
                  className="link-button"
                  onClick={() => navigate("/login")}
                >
                  התחבר
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
            <h3 style={{ color: "#28a745", marginBottom: "15px" }}>
              הבקשה נשלחה בהצלחה!
            </h3>
            <p style={{ color: "#666", marginBottom: "20px" }}>
              אם האימייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה.
              <br />
              אנא בדוק את תיבת הדואר שלך (כולל תיקיית הספאם).
            </p>
            <button
              onClick={() => navigate("/login")}
              className="btn btn-primary"
            >
              חזור להתחברות
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
