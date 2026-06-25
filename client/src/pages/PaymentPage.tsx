import { useState, useEffect } from "react";
import { apiCall, API_ENDPOINTS } from "../config/api";
import "../styles/payment-page.css";

interface Plan {
  id: "monthly" | "yearly";
  label: string;
  amount: number;
  currency: string;
  recurring: boolean;
  description: string;
}

interface Subscription {
  plan: string;
  status: string;
  billingCycle?: string;
  startDate?: string;
  renewalDate?: string;
}

export default function PaymentPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
    loadStatus();
  }, []);

  async function loadPlans() {
    try {
      const data = await apiCall<{ plans: Plan[] }>(API_ENDPOINTS.payment.plans);
      setPlans(data.plans);
    } catch {
      setError("שגיאה בטעינת התוכניות");
    }
  }

  async function loadStatus() {
    try {
      const data = await apiCall<{ subscription: Subscription }>(API_ENDPOINTS.payment.status);
      setSubscription(data.subscription);
    } catch {
      // לא מחובר או אין מנוי — בסדר
    }
  }

  async function handlePurchase(planId: "monthly" | "yearly") {
    setLoading(true);
    setError(null);
    setSelectedPlan(planId);
    try {
      const data = await apiCall<{ iframeUrl: string }>(API_ENDPOINTS.payment.initiate, {
        method: "POST",
        body: JSON.stringify({ billingCycle: planId }),
      });
      setIframeUrl(data.iframeUrl);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "שגיאה ביצירת תשלום");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("האם אתה בטוח שברצונך לבטל את המנוי?")) return;
    setLoading(true);
    try {
      await apiCall(API_ENDPOINTS.payment.cancel, { method: "POST" });
      setSubscription((prev) => prev ? { ...prev, status: "cancelled" } : null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "שגיאה בביטול המנוי");
    } finally {
      setLoading(false);
    }
  }

  // תצוגת iframe תשלום
  if (iframeUrl) {
    return (
      <div className="payment-iframe-wrapper">
        <h2>השלמת תשלום</h2>
        <p>אנא מלא את פרטי התשלום בטופס המאובטח:</p>
        <iframe
          src={iframeUrl}
          title="PayMe Payment"
          className="payment-iframe"
        />
        <button
          className="payment-back-btn"
          onClick={() => { setIframeUrl(null); setSelectedPlan(null); }}
        >
          ← חזרה
        </button>
      </div>
    );
  }

  // תצוגת מנוי פעיל
  if (subscription?.status === "active") {
    return (
      <div className="payment-container">
        <h2>המנוי שלך ✅</h2>
        <div className="payment-active-box">
          <p><strong>תוכנית:</strong> PRO</p>
          <p><strong>חיוב:</strong> {subscription.billingCycle === "monthly" ? "חודשי — 30 ₪" : "שנתי — 300 ₪"}</p>
          <p><strong>סטטוס:</strong> פעיל</p>
          {subscription.startDate && (
            <p><strong>התחלה:</strong> {new Date(subscription.startDate).toLocaleDateString("he-IL")}</p>
          )}
          {subscription.renewalDate && (
            <p><strong>חידוש הבא:</strong> {new Date(subscription.renewalDate).toLocaleDateString("he-IL")}</p>
          )}
        </div>
        <button className="payment-cancel-btn" onClick={handleCancel} disabled={loading}>
          {loading ? "מבטל..." : "ביטול מנוי"}
        </button>
        {error && <p className="payment-error">{error}</p>}
      </div>
    );
  }

  // תצוגת בחירת תוכנית
  return (
    <div className="payment-container">
      <h1 className="payment-title">שדרגו ל-PRO 👑</h1>
      <p className="payment-subtitle">
        גישה מלאה לכל הקורסים, פרופילים מרובים והגשת הצעות למכרזים
      </p>

      {error && <div className="payment-error-box">{error}</div>}

      <div className="payment-plans">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`payment-plan-card ${selectedPlan === plan.id ? "selected" : ""}`}
          >
            {plan.id === "yearly" && (
              <div className="payment-badge">חיסכון של 60 ₪</div>
            )}
            <h3>{plan.label}</h3>
            <p className="payment-plan-desc">{plan.description}</p>
            <div className="payment-plan-price">
              ₪{plan.amount}
              <span>{plan.id === "monthly" ? " / חודש" : " / שנה"}</span>
            </div>
            {plan.id === "yearly" && (
              <p className="payment-plan-saving">כ-25 ₪ לחודש</p>
            )}
            <button
              className="payment-plan-btn"
              onClick={() => handlePurchase(plan.id)}
              disabled={loading}
            >
              {loading && selectedPlan === plan.id ? "טוען..." : "לרכישה"}
            </button>
          </div>
        ))}
      </div>

      <p className="payment-footer">🔒 תשלום מאובטח | ניתן לבטל בכל עת</p>
    </div>
  );
}