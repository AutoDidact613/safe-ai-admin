import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUsageData } from "../../hooks/useUsageData";
import { useAuth } from "../../context/AuthContext";

function ProgressBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const color = pct > 90 ? "#f44336" : pct > 70 ? "#ff9800" : "#4caf50";
  return (
    <div style={{ width: "100%", height: "12px", backgroundColor: "#e0e0e0", borderRadius: "6px", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, transition: "width 0.4s ease", borderRadius: "6px" }} />
    </div>
  );
}

function TopUpModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        backgroundColor: "#fff", borderRadius: "16px", padding: "40px", maxWidth: "480px",
        width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }} onClick={(e) => e.stopPropagation()}>
        {!submitted ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "22px" }}>{t("billing.topUpModal.title")}</h2>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#666" }}>✕</button>
            </div>
            <p style={{ color: "#666", marginBottom: "24px", lineHeight: 1.6 }}>
              {t("billing.topUpModal.description")}
            </p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>{t("billing.topUpModal.emailLabel")}</label>
                <input
                  type="email"
                  value={user?.email ?? ""}
                  readOnly
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", backgroundColor: "#f8f9fa", fontSize: "15px", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>{t("billing.topUpModal.amountLabel")}</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder={t("billing.topUpModal.amountPlaceholder")}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>{t("billing.topUpModal.notesLabel")}</label>
                <textarea
                  placeholder={t("billing.topUpModal.notesPlaceholder")}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: "8px", padding: "14px", fontSize: "16px", borderRadius: "10px" }}>
                {t("billing.topUpModal.submitButton")}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: "56px", marginBottom: "16px" }}>✅</div>
            <h3 style={{ fontSize: "20px", marginBottom: "12px" }}>{t("billing.topUpModal.successTitle")}</h3>
            <p style={{ color: "#666", lineHeight: 1.6, marginBottom: "24px" }}>
              {t("billing.topUpModal.successMessage")}
            </p>
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: "12px 32px" }}>{t("common.close")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { limitsStatus, usageStats, loading } = useUsageData(!!user);
  const [showModal, setShowModal] = useState(false);

  if (loading) return <div className="loading-state">{t("billing.loadingData")}</div>;

  const budget = limitsStatus?.budget;
  const totalCost = usageStats?.totalCost ?? 0;

  return (
    <div>
      <div className="management-header">
        <h2>{t("billing.title")}</h2>
      </div>

      {/* Main balance card */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: "20px", padding: "36px 40px", color: "#fff",
        marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "24px",
      }}>
        <div>
          <p style={{ margin: "0 0 8px", opacity: 0.85, fontSize: "15px" }}>{t("billing.availableMonthlyBalance")}</p>
          <p style={{ margin: "0 0 4px", fontSize: "48px", fontWeight: 700, letterSpacing: "-1px" }}>
            ${budget ? budget.remaining.toFixed(2) : "—"}
          </p>
          {budget && (
            <p style={{ margin: 0, opacity: 0.8, fontSize: "14px" }}>
              {t("billing.outOfMonthlyBudget", { amount: budget.monthlyLimit.toFixed(2) })}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            backgroundColor: "#fff", color: "#764ba2", border: "none",
            borderRadius: "12px", padding: "16px 32px", fontSize: "16px",
            fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
            transition: "transform 0.1s, box-shadow 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.15)"; }}
        >
          {t("billing.topUpButton")}
        </button>
      </div>

      {/* Budget breakdown */}
      {budget && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "24px" }}>{t("billing.budgetBreakdownTitle")}</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
            <div style={{ background: "#f8f9fa", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
              <p style={{ margin: "0 0 8px", color: "#666", fontSize: "13px" }}>{t("billing.monthlyBudgetLabel")}</p>
              <p style={{ margin: 0, fontSize: "26px", fontWeight: 700, color: "#333" }}>${budget.monthlyLimit.toFixed(2)}</p>
            </div>
            <div style={{ background: "#fff3e0", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
              <p style={{ margin: "0 0 8px", color: "#e65100", fontSize: "13px" }}>{t("billing.usedSoFarLabel")}</p>
              <p style={{ margin: 0, fontSize: "26px", fontWeight: 700, color: "#e65100" }}>${budget.currentSpent.toFixed(4)}</p>
            </div>
            <div style={{ background: "#e8f5e9", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
              <p style={{ margin: "0 0 8px", color: "#2e7d32", fontSize: "13px" }}>{t("billing.remainingLabel")}</p>
              <p style={{ margin: 0, fontSize: "26px", fontWeight: 700, color: "#2e7d32" }}>${budget.remaining.toFixed(4)}</p>
            </div>
          </div>

          <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "14px", color: "#555" }}>{t("billing.budgetUsageLabel")}</span>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>{budget.percentUsed.toFixed(1)}%</span>
          </div>
          <ProgressBar used={budget.currentSpent} limit={budget.monthlyLimit} />

          {budget.percentUsed > 80 && (
            <div className="alert alert-warning" style={{ marginTop: "16px" }}>
              <strong>{t("billing.warningLabel")}</strong> {t("billing.warningMessage", { percent: budget.percentUsed.toFixed(0) })}
            </div>
          )}
        </div>
      )}

      {/* Rate limits */}
      {limitsStatus && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "20px" }}>{t("billing.usageLimitsTitle")}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {[
              { label: t("billing.perMinuteLabel"), data: limitsStatus.rateLimits.perMinute },
              { label: t("billing.perDayLabel"), data: limitsStatus.rateLimits.perDay },
            ].map(({ label, data }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "14px", color: "#555" }}>{label}</span>
                  <span style={{ fontSize: "14px", fontWeight: 600 }}>{data.used} / {data.limit}</span>
                </div>
                <ProgressBar used={data.used} limit={data.limit} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage this period */}
      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: "16px" }}>{t("billing.recentCostTitle")}</h3>
        <div style={{ fontSize: "36px", fontWeight: 700, color: "#333" }}>${totalCost.toFixed(4)}</div>
        <p style={{ color: "#888", marginTop: "8px", fontSize: "14px" }}>
          {t("billing.recentCostDescription")}
        </p>
      </div>

      {showModal && <TopUpModal onClose={() => setShowModal(false)} />}
    </div>
  );
}