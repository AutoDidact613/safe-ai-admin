import { useNavigate } from "react-router-dom";
import "../styles/payment-page.css";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="payment-container">
      <div className="payment-active-box" style={{ textAlign: "center" }}>
        <h1>🎉 התשלום הצליח!</h1>
        <p>ברוכים הבאים ל-PRO. תהנו מגישה מלאה לכל התכנים.</p>
        <button
          className="payment-plan-btn"
          style={{ maxWidth: "200px", margin: "1rem auto 0" }}
          onClick={() => navigate("/safeai-ui")}
        >
          לעמוד הראשי
        </button>
      </div>
    </div>
  );
}