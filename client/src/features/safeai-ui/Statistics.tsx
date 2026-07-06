import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        setError(t("statistics.errorLoading"));
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

  const pageTitle = isAdmin
    ? t("statistics.adminTitle")
    : isOrgOwner
    ? t("statistics.orgTitle")
    : t("statistics.userTitle");

  if (loading) {
    return <div className="loading-state">{t("statistics.loadingStats")}</div>;
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <strong>❌ {t("statistics.errorLabel")}</strong> {error}
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
              {t(`statistics.${range}Button`)}
            </button>
          ))}
        </div>
      </div>

      {/* ── כרטיסי סטטיסטיקה ── */}
      {adminStats && (
        <div className="dashboard-grid">
          <div className="stat-card">
            <h3>{t("userDashboard.totalRequestsLabel")}</h3>
            <p className="stat-value">{adminStats.totalRequests.toLocaleString()}</p>
            <p className="stat-change">
              {timeRange === "week"
                ? t("statistics.last7Days")
                : timeRange === "month"
                ? t("statistics.last30Days")
                : t("statistics.lastYear")}
            </p>
          </div>

          {/* מנהל ארגון: משתמשים + מפתחות + יתרה */}
          {isOrgOwner && (
            <>
              <div className="stat-card">
                <h3>{t("statistics.totalUsersLabel")}</h3>
                <p className="stat-value">{adminStats.totalUsers.toLocaleString()}</p>
              </div>

              <div className="stat-card">
                <h3>{t("userDashboard.totalTokensLabel")}</h3>
                <p className="stat-value">{adminStats.totalTokens.toLocaleString()}</p>
              </div>

              <div className="stat-card">
                <h3>{t("statistics.dailyAverageLabel")}</h3>
                <p className="stat-value">{avgRequestsPerDay.toFixed(0)}</p>
              </div>

              <div className="stat-card">
                <h3>{t("userDashboard.totalCostLabel")}</h3>
                <p className="stat-value">${adminStats.totalCost.toFixed(2)}</p>
              </div>

              {adminStats.totalKeys !== undefined && (
                <div className="stat-card">
                  <h3>{t("statistics.totalKeysLabel")}</h3>
                  <p className="stat-value">{adminStats.totalKeys}</p>
                </div>
              )}
            </>
          )}

          {/* מנהל ראשי */}
          {isAdmin && (
            <>
              <div className="stat-card">
                <h3>{t("statistics.successfulRequestsLabel")}</h3>
                <p className="stat-value">{adminStats.successfulRequests.toLocaleString()}</p>
                <p className="stat-change positive">
                  {t("statistics.successPercent", {
                    percent:
                      adminStats.totalRequests > 0
                        ? ((adminStats.successfulRequests / adminStats.totalRequests) * 100).toFixed(1)
                        : "0",
                  })}
                </p>
              </div>

              <div className="stat-card">
                <h3>{t("userDashboard.blockedRequestsLabel")}</h3>
                <p className="stat-value">{adminStats.blockedRequests.toLocaleString()}</p>
                <p className="stat-change negative">
                  {t("userDashboard.blockedPercent", {
                    percent:
                      adminStats.totalRequests > 0
                        ? ((adminStats.blockedRequests / adminStats.totalRequests) * 100).toFixed(1)
                        : "0",
                  })}
                </p>
              </div>

              <div className="stat-card">
                <h3>{t("statistics.activeUsersLabel")}</h3>
                <p className="stat-value">{adminStats.activeUsers}</p>
                <p className="stat-change">{t("statistics.outOfTotal", { total: adminStats.totalUsers })}</p>
              </div>

              <div className="stat-card">
                <h3>{t("userDashboard.avgResponseTimeLabel")}</h3>
                <p className="stat-value">{adminStats.avgResponseTime.toFixed(0)}ms</p>
              </div>

              <div className="stat-card">
                <h3>{t("userDashboard.totalTokensLabel")}</h3>
                <p className="stat-value">{adminStats.totalTokens.toLocaleString()}</p>
              </div>

              <div className="stat-card">
                <h3>{t("statistics.dailyAverageLabel")}</h3>
                <p className="stat-value">{avgRequestsPerDay.toFixed(0)}</p>
              </div>

              <div className="stat-card">
                <h3>{t("userDashboard.totalCostLabel")}</h3>
                <p className="stat-value">${adminStats.totalCost.toFixed(2)}</p>
              </div>
            </>
          )}

          {/* משתמש רגיל */}
          {!isAdmin && !isOrgOwner && (
            <>
              <div className="stat-card">
                <h3>{t("statistics.successfulRequestsLabel")}</h3>
                <p className="stat-value">{adminStats.successfulRequests.toLocaleString()}</p>
                <p className="stat-change positive">
                  {t("statistics.successPercent", {
                    percent:
                      adminStats.totalRequests > 0
                        ? ((adminStats.successfulRequests / adminStats.totalRequests) * 100).toFixed(1)
                        : "0",
                  })}
                </p>
              </div>

              <div className="stat-card">
                <h3>{t("userDashboard.totalTokensLabel")}</h3>
                <p className="stat-value">{adminStats.totalTokens.toLocaleString()}</p>
              </div>

              <div className="stat-card">
                <h3>{t("userDashboard.totalCostLabel")}</h3>
                <p className="stat-value">${adminStats.totalCost.toFixed(2)}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── טבלת פירוט יומי ── */}
      <div className="card" style={{ marginTop: "24px" }}>
        <h3>{t("statistics.dailyBreakdownTitle")}</h3>
        <div style={{ marginTop: "16px", maxHeight: "400px", overflowY: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t("statistics.tableDate")}</th>
                {isOrgOwner && <th>{t("statistics.tableUser")}</th>}
                <th>{t("userDashboard.requestsHeaderLabel")}</th>
                {isAdmin && <th>{t("statistics.tableBlocked")}</th>}
                {isAdmin && <th>{t("statistics.tableSuccessRate")}</th>}
              </tr>
            </thead>
            <tbody>
              {usageData.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 4 : isOrgOwner ? 3 : 2}
                    style={{ textAlign: "center", color: "var(--text-muted)" }}
                  >
                    {t("statistics.noDataLabel")}
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
                        <td>{new Date(day.date).toLocaleDateString()}</td>
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
      </div>

      {/* ── תובנות מערכת (רק מנהל ראשי) ── */}
      {adminStats && isAdmin && (
        <div className="card" style={{ marginTop: "24px" }}>
          <h3>{t("statistics.systemInsightsTitle")}</h3>
          <div style={{ marginTop: "16px" }}>
            <div className="alert alert-info">
              <strong>📊 {t("statistics.systemAnalysisLabel")}</strong>
              <ul style={{ marginTop: "8px", marginBottom: "0", paddingRight: "20px" }}>
                <li>{t("statistics.dailyAverageInsight", { avg: avgRequestsPerDay.toFixed(0) })}</li>
                <li>{t("statistics.blockRateInsight", { rate: blockRate })}</li>
                <li>
                  {t("statistics.activeUsersInsight", {
                    active: adminStats.activeUsers,
                    total: adminStats.totalUsers,
                    percent:
                      adminStats.totalUsers > 0
                        ? ((adminStats.activeUsers / adminStats.totalUsers) * 100).toFixed(1)
                        : "0",
                  })}
                </li>
                <li>
                  {parseFloat(blockRate) < 10
                    ? t("statistics.insightLowBlockRate")
                    : parseFloat(blockRate) < 25
                    ? t("statistics.insightMediumBlockRate")
                    : t("statistics.insightHighBlockRate")}
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
