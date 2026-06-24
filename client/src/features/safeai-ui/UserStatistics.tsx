import { useState, useEffect, useMemo } from "react";
import { API_ENDPOINTS, apiCall } from "../../config/api";

interface UserStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
}

interface DailyRow {
  date: string;
  requests: number;
  blocked: number;
  tokens?: number;
  cost?: number;
}

interface DailyResponse {
  _id: string;
  requests: number;
  tokens: number;
  cost: number;
}

export default function UserStatistics() {
  const [stats, setStats] = useState<UserStats | null>(null);
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
        const [statsData, daily] = await Promise.all([
          apiCall<UserStats>(`${API_ENDPOINTS.usage.stats}?days=${days}`, { signal }),
          apiCall<DailyResponse[]>(`${API_ENDPOINTS.usage.daily}?days=${days}`, { signal }),
        ]);
        setStats(statsData);
        setUsageData(daily.map(d => ({ date: d._id, requests: d.requests || 0, blocked: 0, tokens: d.tokens || 0, cost: d.cost || 0 })));
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

  const { avgRequestsPerDay } = useMemo(() => ({
    avgRequestsPerDay: usageData.length > 0 ? usageData.reduce((s, d) => s + d.requests, 0) / usageData.length : 0,
  }), [usageData]);

  if (loading) return <div className="loading-state">טוען סטטיסטיקות...</div>;
  if (error) return <div className="alert alert-error"><strong>❌ שגיאה:</strong> {error}</div>;

  return (
    <div>
      <div className="management-header">
        <h2>סטטיסטיקות שימוש</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          {(["week", "month", "year"] as const).map((r) => (
            <button key={r} className={timeRange === r ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setTimeRange(r)}>
              {r === "week" ? "שבוע" : r === "month" ? "חודש" : "שנה"}
            </button>
          ))}
        </div>
      </div>

      {stats && (
        <div className="dashboard-grid">
          <div className="stat-card"><h3>סה"כ בקשות</h3><p className="stat-value">{stats.totalRequests}</p></div>
          <div className="stat-card">
            <h3>בקשות מוצלחות</h3><p className="stat-value">{stats.successfulRequests}</p>
            <p className="stat-change positive">{stats.totalRequests > 0 ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1) : "0"}% הצלחה</p>
          </div>
          <div className="stat-card"><h3>סה"כ Tokens</h3><p className="stat-value">{stats.totalTokens.toLocaleString()}</p><p className="stat-change">ממוצע: {Math.round(stats.totalTokens / (stats.totalRequests || 1))} לבקשה</p></div>
          <div className="stat-card"><h3>עלות כוללת</h3><p className="stat-value">${stats.totalCost.toFixed(4)}</p></div>
          <div className="stat-card"><h3>זמן תגובה ממוצע</h3><p className="stat-value">{Math.round(stats.avgResponseTime)}ms</p></div>
          <div className="stat-card"><h3>ממוצע יומי</h3><p className="stat-value">{avgRequestsPerDay.toFixed(0)}</p><p className="stat-change">בקשות ליום</p></div>
        </div>
      )}

      <div className="card" style={{ marginTop: "24px" }}>
        <h3>פירוט יומי</h3>
        <div style={{ marginTop: "16px", maxHeight: "400px", overflowY: "auto" }}>
          <table className="table">
            <thead><tr><th>תאריך</th><th>בקשות</th><th>Tokens</th><th>עלות</th></tr></thead>
            <tbody>
              {usageData.slice().reverse().map((day) => (
                <tr key={day.date}>
                  <td>{new Date(day.date).toLocaleDateString("he-IL")}</td>
                  <td>{day.requests}</td>
                  <td>{(day.tokens ?? 0).toLocaleString()}</td>
                  <td>${(day.cost ?? 0).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
