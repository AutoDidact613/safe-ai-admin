import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
            `הרשמה הושלמה בהצלחה!\n\nמפתח ה-API שלך:\n${response.proxyApiKey}\n\n⚠️ שמור מפתח זה במקום בטוח - לא תוכל לראותו שוב!`
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
          setError("אימייל או סיסמה שגויים. נסה: admin@safeai.com / admin123");
        }
      }
    } catch (err: unknown) {
      console.error("Auth error:", err);
      const errorMessage = err instanceof Error ? err.message : "שגיאה בתהליך ההרשמה/התחברות";
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
            התחברות
          </button>
          <button
            className={authMode === "register" ? "auth-tab active" : "auth-tab"}
            onClick={() => setAuthMode("register")}
          >
            הרשמה
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {authMode === "register" && (
            <>
              <div className="form-group">
                <label htmlFor="name">שם מלא *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="הזן שם מלא"
                />
              </div>

              <div className="form-group">
                <label htmlFor="organization">ארגון</label>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  placeholder="שם הארגון (אופציונלי)"
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">סוג משתמש *</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
                >
                  <option value="user">👤 משתמש רגיל</option>
                  <option value="admin">👑 מנהל</option>
                </select>
                <small style={{ display: "block", marginTop: "5px", color: "#666" }}>
                  {formData.role === "admin" 
                    ? "מנהל יכול לנהל משתמשים, פרופילים ומפתחות"
                    : "משתמש רגיל יכול להשתמש במערכת ולנהל מפתחות API"}
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="mode">מצב שימוש *</label>
                <select
                  id="mode"
                  name="mode"
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value as "BYOK" | "MANAGED" })}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}
                >
                  <option value="BYOK">🔑 BYOK - הבא מפתח משלך</option>
                  <option value="MANAGED">🏢 MANAGED - שימוש במפתחות המערכת</option>
                </select>
                <small style={{ display: "block", marginTop: "5px", color: "#666" }}>
                  {formData.mode === "BYOK"
                    ? "תוכל להוסיף מפתחות API משלך לספקים שונים"
                    : "המערכת תנהל את המפתחות עבורך"}
                </small>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">אימייל</label>
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
            <label htmlFor="password">סיסמה</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="הזן סיסמה"
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
              <strong>למטרות הדגמה:</strong>
              <br />
              אימייל: admin@safeai.com
              <br />
              סיסמה: admin123
            </div>
          )}

          {authMode === "register" && (
            <div className="form-info">
              <p>בהרשמה אתם מסכימים לתנאי השימוש ומדיניות הפרטיות שלנו</p>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? "מעבד..." : authMode === "login" ? "התחבר" : "הירשם"}
          </button>
        </form>

        <div className="auth-footer">
          {authMode === "login" ? (
            <p>
              עדיין אין לך חשבון?{" "}
              <button
                className="link-button"
                onClick={() => setAuthMode("register")}
              >
                הירשם כעת
              </button>
            </p>
          ) : (
            <p>
              כבר יש לך חשבון?{" "}
              <button
                className="link-button"
                onClick={() => setAuthMode("login")}
              >
                התחבר
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
