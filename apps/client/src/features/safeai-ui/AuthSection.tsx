import { useState } from "react";
import { API_ENDPOINTS, apiCall } from "../../config/api";

interface AuthSectionProps {
  onLogin: (role: "admin" | "user", userData?: UserData) => void;
}

interface UserData {
  email: string;
  name: string;
  _id?: string;
}

export default function AuthSection({ onLogin }: AuthSectionProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        // Simulate login - in production, call your auth API
        if (role === "admin") {
          // Admin login simulation
          if (formData.email === "admin@safeai.com" && formData.password === "admin123") {
            onLogin("admin", { email: formData.email, name: "Admin User" });
          } else {
            setError("אימייל או סיסמה שגויים");
          }
        } else {
          // User login simulation
          onLogin("user", { email: formData.email, name: formData.name || "משתמש" });
        }
      } else {
        // Register mode - call the server API
        const data = await apiCall<{ success: boolean; user: UserData; proxyApiKey: string }>(
          API_ENDPOINTS.users,
          {
            method: "POST",
            body: JSON.stringify({
              email: formData.email,
              name: formData.name,
            }),
          }
        );
        
        // Show success message with API key
        alert(`הרשמה הצליחה!\n\nמפתח ה-API שלך:\n${data.proxyApiKey}\n\nשמור מפתח זה במקום בטוח!`);
        
        // Auto login after registration
        onLogin("user", data.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-tabs">
        <button
          className={mode === "login" ? "auth-tab active" : "auth-tab"}
          onClick={() => setMode("login")}
        >
          התחברות
        </button>
        <button
          className={mode === "register" ? "auth-tab active" : "auth-tab"}
          onClick={() => setMode("register")}
        >
          הרשמה
        </button>
      </div>

      {mode === "login" && (
        <div className="role-selector">
          <div
            className={role === "user" ? "role-option selected" : "role-option"}
            onClick={() => setRole("user")}
          >
            <h3>משתמש</h3>
            <p>גישה ללוח משתמש וסטטיסטיקות</p>
          </div>
          <div
            className={role === "admin" ? "role-option selected" : "role-option"}
            onClick={() => setRole("admin")}
          >
            <h3>מנהל</h3>
            <p>ניהול פרופילים ומשתמשים</p>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>אימייל</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="your@email.com"
          />
        </div>

        {mode === "register" && (
          <div className="form-group">
            <label>שם</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="השם שלך"
            />
          </div>
        )}

        {mode === "login" && (
          <div className="form-group">
            <label>סיסמה</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="••••••••"
            />
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "מעבד..." : mode === "login" ? "התחבר" : "הירשם"}
        </button>
      </form>

      {mode === "login" && role === "admin" && (
        <div className="alert alert-info" style={{ marginTop: "16px" }}>
          <strong>למטרות הדגמה:</strong>
          <br />
          אימייל: admin@safeai.com
          <br />
          סיסמה: admin123
        </div>
      )}
    </div>
  );
}
