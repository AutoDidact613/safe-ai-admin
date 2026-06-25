import { useNavigate } from "react-router-dom";
import "../styles/payment-page.css";

export default function PaymentFailPage() {
  const navigate = useNavigate();

  return (
    <div className="payment-container">
      <div className="payment-error-box" style={{ textAlign: "center" }}>
        <h1>❌ התשלום נכשל</h1>
        <p>משהו השתבש. אנא נסו שוב.</p>
        <button
          className="payment-plan-btn"
          style={{ maxWidth: "200px", margin: "1rem auto 0" }}
          onClick={() => navigate("/payment")}
        >
          חזרה לדף התשלום
        </button>
      </div>
    </div>
  );
}