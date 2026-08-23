import { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiCall, API_ENDPOINTS } from "../../config/api";

export default function EmailVerification() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const hasVerified = useRef(false);
  const verifyEmail = useCallback(
    async (verificationToken: string) => {
      try {
        const response = await apiCall<{
          success: boolean;
          message: string;
        }>(API_ENDPOINTS.auth.verifyEmail(verificationToken), {
          method: "GET",
        });

        if (response.success) {
          setStatus("success");
          setMessage(response.message);
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate("/login");
          }, 3000);
        }
      } catch (err: unknown) {
        console.error("Email verification error:", err);
        setStatus("error");
        const errorMessage =
          err instanceof Error ? err.message : "אימות האימייל נכשל";
        setMessage(errorMessage);
      }
    },
    [navigate],
  );

  useEffect(() => {
    if (hasVerified.current)
       return;
    hasVerified.current = true;
    if (token) {
      verifyEmail(token);
    } else {
      setStatus("error");
      setMessage("קישור אימות לא תקין");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="auth-form-container">
      <div className="auth-form-wrapper">
        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div className="spinner" style={{ margin: "0 auto 20px" }}></div>
            <h2>מאמת את האימייל שלך...</h2>
            <p style={{ color: "#666" }}>אנא המתן</p>
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
              האימייל אומת בהצלחה!
            </h2>
            <p style={{ color: "#666", marginBottom: "20px" }}>{message}</p>
            <p style={{ color: "#999", fontSize: "14px" }}>
              מעביר אותך לדף ההתחברות...
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
              אימות האימייל נכשל
            </h2>
            <p style={{ color: "#666", marginBottom: "30px" }}>{message}</p>
            <div
              style={{ display: "flex", gap: "10px", justifyContent: "center" }}
            >
              <button
                onClick={() => navigate("/login")}
                className="btn btn-primary"
              >
                חזור להתחברות
              </button>
              <button
                onClick={() => navigate("/register")}
                className="btn btn-secondary"
              >
                הירשם מחדש
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
