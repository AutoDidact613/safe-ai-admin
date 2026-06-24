import { useState, useEffect, useMemo } from "react";
import { API_ENDPOINTS, apiCall } from "../../config/api";

interface AdminStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  blockedRequests: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  totalUsers: number;
  activeUsers: number;
}

interface DailyRow {
  date: string;
  requests: number;
  blocked: number;
}

interface DailyResponse {
  _id: string;
  requests: number;
  blocked?: number;
}

export default function AdminStatistics() {
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [usageData, setUsageData] = useState<DailyRow[]>([]);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const days = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 365;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [stats, daily] = await Promise.all([
          apiCall<AdminStats>(`${API_ENDPOINTS.adminStats.stats}?days=${days}`, { signal }),
          apiCall<DailyResponse[]>(`${API_ENDPOINTS.adminStats.daily}?days=${days}`, { signal }),
        ]);
        setAdminStats(stats);
        setUsageData(daily.map(d => ({ date: d._id, requests: d.requests || 0, blocked: d.blocked || 0 })));
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("שגיאה בטעינת הסטטיסטיקות");
        }
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [timeRange]);

  const { avgRequestsPerDay, blockRate } = useMemo(() => {
    const total = usageData.reduce((s, d) => s + d.requests, 0);
    const blocked = usageData.reduce((s, d) => s + d.blocked, 0);
    return {
      avgRequestsPerDay: usageData.length > 0 ? total / usageData.length : 0,
      blockRate: total > 0 ? ((blocked / total) * 100).toFixed(1) : "0.0",
    };
  }, [usageData]);

  if (loading) return <div className="loading-state">טוען סטטיסטיקות...</div>;
  if (error) return <div className="alert alert-error"><strong>❌ שגיאה:</strong> {error}</div>;

  return (
    <div>
      <div className="management-header">
        <h2>סטטיסטיקות מערכת - מנהל</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          {(["week", "month", "year"] as const).map((r) => (
            <button key={r} className={timeRange === r ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setTimeRange(r)}>
              {r === "week" ? "שבוע" : r === "month" ? "חודש" : "שנה"}
            </button>
          ))}
        </div>
      </div>

      {adminStats && (
        <div className="dashboard-grid">
          <div className="stat-card"><h3>סה"כ בקשות</h3><p className="stat-value">{adminStats.totalRequests}</p></div>
          <div className="stat-card">
            <h3>בקשות מוצלחות</h3><p className="stat-value">{adminStats.successfulRequests}</p>
            <p className="stat-change positive">{adminStats.totalRequests > 0 ? ((adminStats.successfulRequests / adminStats.totalRequests) * 100).toFixed(1) : "0"}% הצלחה</p>
          </div>
          <div className="stat-card">
            <h3>בקשות חסומות</h3><p className="stat-value">{adminStats.blockedRequests}</p>
            <p className="stat-change negative">{adminStats.totalRequests > 0 ? ((adminStats.blockedRequests / adminStats.totalRequests) * 100).toFixed(1) : "0"}% חסימה</p>
          </div>
          <div className="stat-card"><h3>משתמשים פעילים</h3><p className="stat-value">{adminStats.activeUsers}</p><p className="stat-change">מתוך {adminStats.totalUsers} סה"כ</p></div>
          <div className="stat-card"><h3>סה"כ Tokens</h3><p className="stat-value">{adminStats.totalTokens.toLocaleString()}</p><p className="stat-change">ממוצע: {Math.round(adminStats.totalTokens / (adminStats.totalRequests || 1))} לבקשה</p></div>
          <div className="stat-card"><h3>עלות כוללת</h3><p className="stat-value">${adminStats.totalCost.toFixed(4)}</p><p className="stat-change">ממוצע: ${(adminStats.totalCost / (adminStats.totalRequests || 1)).toFixed(6)} לבקשה</p></div>
          <div className="stat-card"><h3>זמן תגובה ממוצע</h3><p className="stat-value">{Math.round(adminStats.avgResponseTime)}ms</p></div>
          <div className="stat-card"><h3>ממוצע יומי</h3><p className="stat-value">{avgRequestsPerDay.toFixed(0)}</p><p className="stat-change">בקשות ליום</p></div>
        </div>
      )}

      <div className="card" style={{ marginTop: "24px" }}>
        <h3>פירוט יומי</h3>
        <div style={{ marginTop: "16px", maxHeight: "400px", overflowY: "auto" }}>
          <table className="table">
            <thead><tr><th>תאריך</th><th>בקשות</th><th>חסומות</th><th>שיעור הצלחה</th></tr></thead>
            <tbody>
              {usageData.slice().reverse().map((day) => {
                const rate = day.requests > 0 ? ((day.requests - day.blocked) / day.requests * 100).toFixed(1) : "100.0";
                return (
                  <tr key={day.date}>
                    <td>{new Date(day.date).toLocaleDateString("he-IL")}</td>
                    <td>{day.requests}</td>
                    <td><span className="badge badge-danger">{day.blocked}</span></td>
                    <td><span className={parseFloat(rate) > 80 ? "badge badge-success" : "badge badge-warning"}>{rate}%</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {adminStats && (
        <div className="card" style={{ marginTop: "24px" }}>
          <h3>תובנות מערכת</h3>
          <div style={{ marginTop: "16px" }}>
            <div className="alert alert-info">
              <strong>📊 ניתוח מערכת:</strong>
              <ul style={{ marginTop: "8px", marginBottom: "0", paddingRight: "20px" }}>
                <li>הממוצע היומי במערכת: {avgRequestsPerDay.toFixed(0)} בקשות</li>
                <li>שיעור החסימה במערכת: {blockRate}%</li>
                <li>משתמשים פעילים: {adminStats.activeUsers} מתוך {adminStats.totalUsers} ({adminStats.totalUsers > 0 ? ((adminStats.activeUsers / adminStats.totalUsers) * 100).toFixed(1) : "0"}%)</li>
                <li>{parseFloat(blockRate) < 10 ? "שיעור חסימה נמוך - המערכת פועלת כראוי! ✅" : parseFloat(blockRate) < 25 ? "שיעור חסימה בינוני - מומלץ לבדוק את הפרופילים ⚠️" : "שיעור חסימה גבוה - נדרשת בדיקה של הפרופילים והגדרות 🔴"}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
