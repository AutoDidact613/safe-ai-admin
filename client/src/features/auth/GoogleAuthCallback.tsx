import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function GoogleAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

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
        state: { error: t("googleAuth.errorMessage") }
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
            message: t("googleAuth.accountCreatedMessage"),
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
  }, [searchParams, navigate, t]);

  return (
    <div className="auth-form-container">
      <div className="auth-form-wrapper">
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div className="spinner" style={{ margin: "0 auto 20px" }}></div>
          <h2>{t("googleAuth.connectingTitle")}</h2>
          <p style={{ color: "#666" }}>{t("emailVerification.pleaseWait")}</p>
        </div>
      </div>
    </div>
  );
}
