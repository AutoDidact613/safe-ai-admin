import { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../../config/api";

interface StatisticsProps {
  user: {
    email: string;
    name: string;
    _id?: string;
    role?: string;
  } | null;
}

interface UsageData {
  date: string;
  requests: number;
  blocked: number;
  tokens?: number;
  cost?: number;
  user?: string;
}

interface DailyUsageResponse {
  _id: string;
  requests: number;
  tokens: number;
  cost: number;
  avgResponseTime?: number;
  user?: string;
}

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
  walletBalance?: number;
  totalKeys?: number;
}

export default function Statistics({ user }: StatisticsProps) {
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("week");
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userRole = localStorage.getItem("userRole") || user?.role || "";
  const isAdmin = userRole === "admin" || user?.role === "admin";
  const isOrgOwner = userRole === "org_owner" || user?.role === "org_owner";

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      setError(null);

      try {
        const accessToken = localStorage.getItem("accessToken");
        const days = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 365;

        if (isAdmin) {
          // ── מנהל ראשי ──────────────────────────────────────────
          const [statsRes, dailyRes] = await Promise.all([
            fetch(`${API_ENDPOINTS.adminStats.stats}?days=${days}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
            fetch(`${API_ENDPOINTS.adminStats.daily}?days=${days}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
          ]);

          if (!statsRes.ok || !dailyRes.ok) throw new Error("Failed to fetch statistics");

          const stats = await statsRes.json();
          const daily = await dailyRes.json();
          setAdminStats(stats);
          setUsageData(daily);

        } else if (isOrgOwner) {
          // ── מנהל ארגון ─────────────────────────────────────────
          const [statsRes, dailyRes] = await Promise.all([
            fetch(`${API_ENDPOINTS.usage.stats}?days=${days}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
            fetch(`${API_ENDPOINTS.usage.daily}?days=${days}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
          ]);

          if (!statsRes.ok || !dailyRes.ok) throw new Error("Failed to fetch statistics");

          const stats = await statsRes.json();
          const daily = await dailyRes.json();

          setAdminStats({
            totalRequests: stats.totalRequests || 0,
            successfulRequests: stats.successfulRequests || 0,
            failedRequests: stats.failedRequests || 0,
            blockedRequests: stats.blockedRequests || 0,
            totalTokens: stats.totalTokens || 0,
            totalCost: stats.totalCost || 0,
            avgResponseTime: stats.avgResponseTime || 0,
            totalUsers: stats.totalUsers || 0,
            activeUsers: stats.activeUsers || 0,
            walletBalance: stats.walletBalance,
            totalKeys: stats.totalKeys,
          });

          const transformedDaily: UsageData[] = daily.map((day: DailyUsageResponse) => ({
            date: day._id,
            requests: day.requests || 0,
            blocked: 0,
            tokens: day.tokens || 0,
            cost: day.cost || 0,
            user: day.user,
          }));
          setUsageData(transformedDaily);

        } else {
          // ── משתמש רגיל ─────────────────────────────────────────
          const [statsRes, dailyRes] = await Promise.all([
            fetch(`${API_ENDPOINTS.usage.stats}?days=${days}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
            fetch(`${API_ENDPOINTS.usage.daily}?days=${days}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
          ]);

          if (!statsRes.ok || !dailyRes.ok) throw new Error("Failed to fetch statistics");

          const stats = await statsRes.json();
          const daily = await dailyRes.json();

          setAdminStats({
            totalRequests: stats.totalRequests || 0,
            successfulRequests: stats.successfulRequests || 0,
            failedRequests: stats.failedRequests || 0,
            blockedRequests: 0,
            totalTokens: stats.totalTokens || 0,
            totalCost: stats.totalCost || 0,
            avgResponseTime: stats.avgResponseTime || 0,
            totalUsers: 1,
            activeUsers: 1,
          });

          const transformedDaily: UsageData[] = daily.map((day: DailyUsageResponse) => ({
            date: day._id,
            requests: day.requests || 0,
            blocked: 0,
            tokens: day.tokens || 0,
            cost: day.cost || 0,
          }));
          setUsageData(transformedDaily);
        }
      } catch (err) {
        console.error("Error fetching statistics:", err);
        setError("שגיאה בטעינת הסטטיסטיקות");
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchStatistics();
  }, [timeRange, user]);

  const totalRequests = usageData.reduce((sum, day) => sum + day.requests, 0);
  const totalBlocked = usageData.reduce((sum, day) => sum + day.blocked, 0);
  const avgRequestsPerDay = usageData.length ? totalRequests / usageData.length : 0;
  const blockRate = totalRequests > 0 ? ((totalBlocked / totalRequests) * 100).toFixed(1) : "0";

  const pageTitle = isAdmin || isOrgOwner
    ? "סטטיסטיקות מערכת"
    : "סטטיסטיקות שימוש";

  if (loading) {
    return <div className="loading-state">טוען סטטיסטיקות...</div>;
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <strong>שגיאה:</strong> {error}
      </div>
    );
  }

  return (
    <div>
      {/* ── כותרת + מסנן זמן ── */}
      <div className="management-header">
        <h2>{pageTitle}</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          {(["week", "month", "year"] as const).map((range) => (
            <button
              key={range}
              className={timeRange === range ? "btn btn-primary" : "btn btn-secondary"}
              onClick={() => setTimeRange(range)}
            >
              {range === "week" ? "שבוע" : range === "month" ? "חודש" : "שנה"}
            </button>
          ))}
        </div>
      </div>

      {/* ── כרטיסי סטטיסטיקה ── */}
      {adminStats && (
        <div className="dashboard-grid">
          <div className="stat-card">
            <h3>סה"כ בקשות</h3>
            <p className="stat-value">{adminStats.totalRequests.toLocaleString("he-IL")}</p>
          </div>

          {/* מנהל ארגון: משתמשים + מפתחות + יתרה */}
          {isOrgOwner && (
            <>
              <div className="stat-card">
                <h3>סה"כ משתמשים</h3>
                <p className="stat-value">{adminStats.totalUsers.toLocaleString("he-IL")}</p>
              </div>

              <div className="stat-card">
                <h3>סה"כ Tokens</h3>
                <p className="stat-value">{adminStats.totalTokens.toLocaleString("he-IL")}</p>
              </div>

              <div className="stat-card">
                <h3>ממוצע יומי</h3>
                <p className="stat-value">{avgRequestsPerDay.toFixed(0)}</p>
              </div>

              <div className="stat-card">
                <h3>עלות כוללת</h3>
                <p className="stat-value">${adminStats.totalCost.toFixed(2)}</p>
              </div>

              {adminStats.totalKeys !== undefined && (
                <div className="stat-card">
                  <h3>סה"כ מפתחות</h3>
                  <p className="stat-value">{adminStats.totalKeys}</p>
                </div>
              )}
            </>
          )}

          {/* מנהל ראשי */}
          {isAdmin && (
            <>
              <div className="stat-card">
                <h3>בקשות מוצלחות</h3>
                <p className="stat-value">{adminStats.successfulRequests.toLocaleString("he-IL")}</p>
                <p className="stat-change positive">
                  {adminStats.totalRequests > 0
                    ? ((adminStats.successfulRequests / adminStats.totalRequests) * 100).toFixed(1)
                    : "0"}% הצלחה
                </p>
              </div>

              <div className="stat-card">
                <h3>בקשות חסומות</h3>
                <p className="stat-value">{adminStats.blockedRequests.toLocaleString("he-IL")}</p>
                <p className="stat-change negative">
                  {adminStats.totalRequests > 0
                    ? ((adminStats.blockedRequests / adminStats.totalRequests) * 100).toFixed(1)
                    : "0"}% חסימה
                </p>
              </div>

              <div className="stat-card">
                <h3>משתמשים פעילים</h3>
                <p className="stat-value">{adminStats.activeUsers}</p>
              </div>

              <div className="stat-card">
                <h3>זמן תגובה ממוצע</h3>
                <p className="stat-value">{adminStats.avgResponseTime.toFixed(0)}ms</p>
              </div>

              <div className="stat-card">
                <h3>סה"כ Tokens</h3>
                <p className="stat-value">{adminStats.totalTokens.toLocaleString("he-IL")}</p>
              </div>

              <div className="stat-card">
                <h3>ממוצע יומי</h3>
                <p className="stat-value">{avgRequestsPerDay.toFixed(0)}</p>
              </div>

              <div className="stat-card">
                <h3>עלות כוללת</h3>
                <p className="stat-value">${adminStats.totalCost.toFixed(2)}</p>
              </div>
            </>
          )}

          {/* משתמש רגיל */}
          {!isAdmin && !isOrgOwner && (
            <>
              <div className="stat-card">
                <h3>בקשות מוצלחות</h3>
                <p className="stat-value">{adminStats.successfulRequests.toLocaleString("he-IL")}</p>
                <p className="stat-change positive">
                  {adminStats.totalRequests > 0
                    ? ((adminStats.successfulRequests / adminStats.totalRequests) * 100).toFixed(1)
                    : "0"}% הצלחה
                </p>
              </div>

              <div className="stat-card">
                <h3>סה"כ Tokens</h3>
                <p className="stat-value">{adminStats.totalTokens.toLocaleString("he-IL")}</p>
              </div>

              <div className="stat-card">
                <h3>עלות כוללת</h3>
                <p className="stat-value">${adminStats.totalCost.toFixed(2)}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── טבלת פירוט יומי ── */}
      <div className="card" style={{ marginTop: "24px" }}>
        <h3>פירוט יומי</h3>
        <table className="table" style={{ marginTop: "12px" }}>
          <thead>
            <tr>
              <th>תאריך</th>
              {isOrgOwner && <th>משתמש</th>}
              <th>בקשות</th>
              {(isAdmin) && <th>חסומות</th>}
              {(isAdmin) && <th>שיעור הצלחה</th>}
            </tr>
          </thead>
          <tbody>
            {usageData.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 4 : isOrgOwner ? 3 : 2} style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  אין נתונים לתצוגה
                </td>
              </tr>
            ) : (
              usageData
                .slice()
                .reverse()
                .map((day) => {
                  const successRate =
                    day.requests > 0
                      ? (((day.requests - day.blocked) / day.requests) * 100).toFixed(1)
                      : "0";
                  return (
                    <tr key={day.date}>
                      <td>{new Date(day.date).toLocaleDateString("he-IL")}</td>
                      {isOrgOwner && <td>{day.user || "—"}</td>}
                      <td>{day.requests}</td>
                      {isAdmin && (
                        <td>
                          <span className="badge badge-danger">{day.blocked}</span>
                        </td>
                      )}
                      {isAdmin && (
                        <td>
                          <span
                            className={
                              parseFloat(successRate) > 80
                                ? "badge badge-success"
                                : "badge badge-warning"
                            }
                          >
                            {successRate}%
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>

      {/* ── תובנות מערכת (רק מנהל ראשי) ── */}
      {adminStats && isAdmin && (
        <div className="card" style={{ marginTop: "24px" }}>
          <h3>תובנות מערכת</h3>
          <div style={{ marginTop: "16px" }}>
            <div className="alert alert-info">
              <strong>📊 ניתוח מערכת:</strong>
              <ul style={{ marginTop: "8px", marginBottom: "0", paddingRight: "20px" }}>
                <li>הממוצע היומי במערכת: {avgRequestsPerDay.toFixed(0)} בקשות</li>
                <li>שיעור החסימה במערכת: {blockRate}%</li>
                <li>
                  {parseFloat(blockRate) < 5
                    ? "שיעור חסימה תקין ✅"
                    : parseFloat(blockRate) < 25
                    ? "שיעור חסימה בינוני - מומלץ לבדוק את הפרופילים"
                    : "שיעור חסימה גבוה - נדרשת בדיקה של הפרופילים"}
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
