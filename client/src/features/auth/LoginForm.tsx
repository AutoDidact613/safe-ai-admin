import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiCall, API_ENDPOINTS } from "../../config/api";
import { startActivityTracking } from "../../utils/tokenManager";
import ProfileSelectionModal from "../../components/ProfileSelectionModal";

interface LoginFormData {
  email: string;
  password: string;
}

interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
  mode: string;
  profileId?: string;
}

export default function LoginForm() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle Google OAuth callback
  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const googleAuth = searchParams.get("googleAuth");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      if (errorParam === "user_not_found") {
        setError("המשתמש לא נמצא במערכת. אנא הירשם תחילה.");
      } else {
        setError("שגיאה בהתחברות עם Google. נסה שוב.");
      }
      return;
    }

    if (accessToken && refreshToken && googleAuth === "true") {
      // Store tokens
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      // Fetch user info using the access token
      fetch(`${API_ENDPOINTS.auth.me}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
            localStorage.setItem("userRole", data.user.role);
            
            // Start activity tracking for token management
            startActivityTracking();
            
            // Check if user has a profile
            if (!data.user.profileId) {
              setLoggedInUser(data.user);
              setShowProfileModal(true);
            } else {
              navigate("/safeai-ui");
            }
          }
        })
        .catch((err) => {
          console.error("Error fetching user info:", err);
          setError("שגיאה בטעינת פרטי המשתמש");
        });
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall<{
        success: boolean;
        user: User;
        accessToken: string;
        refreshToken: string;
      }>(API_ENDPOINTS.auth.login, {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (response.success) {
        // Store tokens and user info
        localStorage.setItem("accessToken", response.accessToken);
        localStorage.setItem("refreshToken", response.refreshToken);
        localStorage.setItem("user", JSON.stringify(response.user));
        localStorage.setItem("userRole", response.user.role);

        // Start activity tracking for token management
        startActivityTracking();

        // Check if user has a profile
        if (!response.user.profileId) {
          // Show profile selection modal
          setLoggedInUser(response.user);
          setShowProfileModal(true);
        } else {
          // Navigate to dashboard
          navigate("/safeai-ui");
        }
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "שגיאה בהתחברות";
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

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${API_ENDPOINTS.auth.googleLogin}`;
  };

  const handleProfileSelected = () => {
    // Navigate to dashboard after profile is selected
    navigate("/safeai-ui");
  };

  return (
    <>
      <ProfileSelectionModal
        isOpen={showProfileModal}
        onClose={() => {}} // Don't allow closing without selecting
        userId={loggedInUser?._id || ""}
        onProfileSelected={handleProfileSelected}
      />
      
      <div className="auth-form-container">
      <div className="auth-form-wrapper">
        <h2 className="auth-title">התחברות</h2>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="btn btn-google"
          style={{
            width: "100%",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            backgroundColor: "#fff",
            color: "#333",
            border: "1px solid #ddd",
            padding: "12px",
            fontSize: "16px",
            fontWeight: "500",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
            />
          </svg>
          התחבר עם Google
        </button>

        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          margin: "20px 0",
          gap: "10px"
        }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#ddd" }}></div>
          <span style={{ color: "#666", fontSize: "14px" }}>או</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#ddd" }}></div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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
              autoComplete="email"
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
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "15px" }}>
              {error}
            </div>
          )}

          <div className="form-footer">
            <button
              type="button"
              className="link-button"
              onClick={() => navigate("/forgot-password")}
            >
              שכחתי סיסמה
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? "מתחבר..." : "התחבר"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            עדיין אין לך חשבון?{" "}
            <button
              className="link-button"
              onClick={() => navigate("/register")}
            >
              הירשם כעת
            </button>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
