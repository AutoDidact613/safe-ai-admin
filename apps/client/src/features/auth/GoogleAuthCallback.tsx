import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function GoogleAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const proxyApiKey = searchParams.get("proxyApiKey");
    const newUser = searchParams.get("newUser");
    const error = searchParams.get("error");
    const googleAuth = searchParams.get("googleAuth");

    if (error) {
      // Handle error
      console.error("Google auth error:", error);
      navigate("/login", { 
        state: { error: "התחברות עם Google נכשלה. אנא נסה שוב." } 
      });
      return;
    }

    if (accessToken && refreshToken) {
      // Store tokens
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      // If new user with API key, redirect to API key display
      if (newUser === "true" && proxyApiKey) {
        navigate("/api-key-display", {
          state: {
            proxyApiKey,
            message: "חשבון נוצר בהצלחה עם Google!",
          },
        });
      } else if (googleAuth === "true") {
        // Existing user, redirect to dashboard
        navigate("/safeai-ui");
      } else {
        navigate("/login");
      }
    } else {
      navigate("/login");
    }
  }, [searchParams, navigate]);

  return (
    <div className="auth-form-container">
      <div className="auth-form-wrapper">
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div className="spinner" style={{ margin: "0 auto 20px" }}></div>
          <h2>מתחבר עם Google...</h2>
          <p style={{ color: "#666" }}>אנא המתן</p>
        </div>
      </div>
    </div>
  );
}
