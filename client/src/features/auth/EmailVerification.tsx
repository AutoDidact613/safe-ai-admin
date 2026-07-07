import { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiCall, API_ENDPOINTS } from "../../config/api";
import { startActivityTracking } from "../../utils/tokenManager";
import ProfileSelectionModal from "../../components/ProfileSelectionModal";

interface VerifiedUser {
  _id: string;
  email: string;
  name: string;
  role: string;
  mode: string;
  profileId?: string;
}

export default function EmailVerification() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<VerifiedUser | null>(null);
  const hasVerified = useRef(false);
  const verifyEmail = useCallback(
    async (verificationToken: string) => {
      try {
        const response = await apiCall<{
          success: boolean;
          message: string;
          user?: VerifiedUser;
          accessToken?: string;
          refreshToken?: string;
        }>(API_ENDPOINTS.auth.verifyEmail(verificationToken), {
          method: "GET",
        });

        if (response.success) {
          setStatus("success");
          setMessage(response.message);

          if (response.accessToken && response.refreshToken && response.user) {
            // Log the user in automatically instead of sending them back to /login
            localStorage.setItem("accessToken", response.accessToken);
            localStorage.setItem("refreshToken", response.refreshToken);
            localStorage.setItem("user", JSON.stringify(response.user));
            localStorage.setItem("userRole", response.user.role);
            startActivityTracking();

            setTimeout(() => {
              if (!response.user!.profileId) {
                setLoggedInUser(response.user!);
                setShowProfileModal(true);
              } else {
                navigate("/safeai-ui");
              }
            }, 1500);
          } else {
            // Fallback: no tokens returned, send the user to log in manually
            setTimeout(() => {
              navigate("/login");
            }, 3000);
          }
        }
      } catch (err: unknown) {
        console.error("Email verification error:", err);
        setStatus("error");
        const errorMessage =
          err instanceof Error ? err.message : t("emailVerification.verificationFailedFallback");
        setMessage(errorMessage);
      }
    },
    [navigate, t],
  );

  useEffect(() => {
    if (hasVerified.current)
       return;
    hasVerified.current = true;
    if (token) {
      verifyEmail(token);
    } else {
      setStatus("error");
      setMessage(t("emailVerification.invalidLinkError"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <>
      <ProfileSelectionModal
        isOpen={showProfileModal}
        onClose={() => {}}
        userId={loggedInUser?._id || ""}
        onProfileSelected={() => navigate("/safeai-ui")}
      />
      <div className="auth-form-container">
      <div className="auth-form-wrapper">
        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div className="spinner" style={{ margin: "0 auto 20px" }}></div>
            <h2>{t("emailVerification.verifyingTitle")}</h2>
            <p style={{ color: "#666" }}>{t("emailVerification.pleaseWait")}</p>
          </div>
        )}

        {status === "success" && (
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
              {t("emailVerification.successTitle")}
            </h2>
            <p style={{ color: "#666", marginBottom: "20px" }}>{message}</p>
            <p style={{ color: "#999", fontSize: "14px" }}>
              {t("emailVerification.redirectingMsg")}
            </p>
          </div>
        )}

        {status === "error" && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div
              style={{
                fontSize: "64px",
                marginBottom: "20px",
              }}
            >
              ❌
            </div>
            <h2 style={{ color: "#dc3545", marginBottom: "15px" }}>
              {t("emailVerification.verificationFailedFallback")}
            </h2>
            <p style={{ color: "#666", marginBottom: "30px" }}>{message}</p>
            <div
              style={{ display: "flex", gap: "10px", justifyContent: "center" }}
            >
              <button
                onClick={() => navigate("/login")}
                className="btn btn-primary"
              >
                {t("emailVerification.backToLoginBtn")}
              </button>
              <button
                onClick={() => navigate("/register")}
                className="btn btn-secondary"
              >
                {t("emailVerification.registerAgainBtn")}
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
