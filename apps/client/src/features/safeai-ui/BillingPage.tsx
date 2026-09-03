import { useState } from "react";
import { useUsageData } from "../../hooks/useUsageData";
import { useAuth } from "../../context/authStore";

function ProgressBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const color = pct > 90 ? "var(--color-danger)" : pct > 70 ? "var(--color-warning)" : "var(--color-success)";
  return (
    <div style={{ width: "100%", height: "12px", backgroundColor: "var(--gray-200)", borderRadius: "6px", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, transition: "width 0.4s ease", borderRadius: "6px" }} />
    </div>
  );
}

function TopUpModal({ onClose }: { onClose: () => void }) {
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
      position: "fixed", inset: 0, backgroundColor: "var(--bg-overlay)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        backgroundColor: "var(--bg-surface)", borderRadius: "16px", padding: "40px", maxWidth: "480px",
        width: "90%", boxShadow: "var(--shadow-lg)", direction: "rtl",
      }} onClick={(e) => e.stopPropagation()}>
        {!submitted ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, fontSize: "22px" }}>טעינת יתרה</h2>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <p style={{ color: "var(--text-muted)", marginBottom: "24px", lineHeight: 1.6 }}>
              מערכת התשלומים בפיתוח. מלא את הפרטים ונחזור אליך בהקדם לביצוע הטעינה.
            </p>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>אימייל</label>
                <input
                  type="email"
                  value={user?.email ?? ""}
                  readOnly
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-default)", backgroundColor: "var(--bg-elevated)", fontSize: "15px", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>סכום לטעינה (USD)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="לדוגמה: 20"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-default)", fontSize: "15px", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>הערות (אופציונלי)</label>
                <textarea
                  placeholder="כל מידע נוסף שתרצה להוסיף..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-default)", fontSize: "15px", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: "8px", padding: "14px", fontSize: "16px", borderRadius: "10px" }}>
                שלח בקשה לטעינה
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: "56px", marginBottom: "16px" }}>✅</div>
            <h3 style={{ fontSize: "20px", marginBottom: "12px" }}>הבקשה נשלחה!</h3>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "24px" }}>
              קיבלנו את בקשת הטעינה שלך. נציג יצור איתך קשר בקרוב לסיום התהליך.
            </p>
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: "12px 32px" }}>סגור</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const { limitsStatus, usageStats, loading } = useUsageData(!!user);
  const [showModal, setShowModal] = useState(false);

  if (loading) return <div className="loading-state">טוען נתונים...</div>;

  const budget = limitsStatus?.budget;
  const totalCost = usageStats?.totalCost ?? 0;

  return (
    <div style={{ direction: "rtl" }}>
      <div className="management-header">
        <h2>חיובים ויתרה</h2>
      </div>

      {/* Main balance card */}
      <div style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: "20px", padding: "36px 40px", color: "var(--text-inverse)",
        marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "24px",
      }}>
        <div>
          <p style={{ margin: "0 0 8px", opacity: 0.85, fontSize: "15px" }}>יתרה חודשית זמינה</p>
          <p style={{ margin: "0 0 4px", fontSize: "48px", fontWeight: 700, letterSpacing: "-1px" }}>
            ${budget ? budget.remaining.toFixed(2) : "—"}
          </p>
          {budget && (
            <p style={{ margin: 0, opacity: 0.8, fontSize: "14px" }}>
              מתוך ${budget.monthlyLimit.toFixed(2)} תקציב חודשי
            </p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            backgroundColor: "var(--bg-surface)", color: "#764ba2", border: "none",
            borderRadius: "12px", padding: "16px 32px", fontSize: "16px",
            fontWeight: 700, cursor: "pointer", boxShadow: "var(--shadow-md)",
            transition: "transform 0.1s, box-shadow 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-lg)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
        >
          + טעינת יתרה
        </button>
      </div>

      {/* Budget breakdown */}
      {budget && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "24px" }}>פירוט תקציב חודשי</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
            <div style={{ background: "var(--bg-elevated)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
              <p style={{ margin: "0 0 8px", color: "var(--text-muted)", fontSize: "13px" }}>תקציב חודשי</p>
              <p style={{ margin: 0, fontSize: "26px", fontWeight: 700, color: "var(--text-secondary)" }}>${budget.monthlyLimit.toFixed(2)}</p>
            </div>
            <div style={{ background: "var(--color-warning-bg)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
              <p style={{ margin: "0 0 8px", color: "var(--color-warning)", fontSize: "13px" }}>נוצל עד כה</p>
              <p style={{ margin: 0, fontSize: "26px", fontWeight: 700, color: "var(--color-warning)" }}>${budget.currentSpent.toFixed(4)}</p>
            </div>
            <div style={{ background: "var(--color-success-bg)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
              <p style={{ margin: "0 0 8px", color: "var(--color-success)", fontSize: "13px" }}>נותרו</p>
              <p style={{ margin: 0, fontSize: "26px", fontWeight: 700, color: "var(--color-success)" }}>${budget.remaining.toFixed(4)}</p>
            </div>
          </div>

          <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>ניצול תקציב</span>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>{budget.percentUsed.toFixed(1)}%</span>
          </div>
          <ProgressBar used={budget.currentSpent} limit={budget.monthlyLimit} />

          {budget.percentUsed > 80 && (
            <div className="alert alert-warning" style={{ marginTop: "16px" }}>
              <strong>⚠️ שים לב:</strong> ניצלת {budget.percentUsed.toFixed(0)}% מהתקציב החודשי שלך.
            </div>
          )}
        </div>
      )}

      {/* Rate limits */}
      {limitsStatus && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "20px" }}>מגבלות שימוש</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {[
              { label: "בקשות לדקה", data: limitsStatus.rateLimits.perMinute },
              { label: "בקשות ליום", data: limitsStatus.rateLimits.perDay },
            ].map(({ label, data }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>{label}</span>
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
        <h3 style={{ marginTop: 0, marginBottom: "16px" }}>עלות ב-7 ימים אחרונים</h3>
        <div style={{ fontSize: "36px", fontWeight: 700, color: "var(--text-secondary)" }}>${totalCost.toFixed(4)}</div>
        <p style={{ color: "var(--text-muted)", marginTop: "8px", fontSize: "14px" }}>
          עלות מצטברת של כל הבקשות שבוצעו ב-7 הימים האחרונים.
        </p>
      </div>

      {showModal && <TopUpModal onClose={() => setShowModal(false)} />}
    </div>
  );
}