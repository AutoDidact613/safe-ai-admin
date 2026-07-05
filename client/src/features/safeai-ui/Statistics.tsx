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
}

interface DailyUsageResponse {
  _id: string;
  requests: number;
  tokens: number;
  cost: number;
  avgResponseTime?: number;
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
}

export default function Statistics({ user }: StatisticsProps) {
  const { t } = useTranslation();
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("week");
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const accessToken = localStorage.getItem("accessToken");
        const userRole = localStorage.getItem("userRole");
        const days = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 365;
        
        // Check if user is admin (org_owner is temporarily treated as admin until they re-login)
        const isAdmin = userRole === "admin" || user?.role === "admin";
        
        if (isAdmin) {
          // Fetch admin stats and daily breakdown
          const [statsRes, dailyRes] = await Promise.all([
            fetch(`${API_ENDPOINTS.adminStats.stats}?days=${days}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
            fetch(`${API_ENDPOINTS.adminStats.daily}?days=${days}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
          ]);

          if (!statsRes.ok || !dailyRes.ok) {
            throw new Error("Failed to fetch statistics");
          }

          const stats = await statsRes.json();
          const daily = await dailyRes.json();

          setAdminStats(stats);
          setUsageData(daily);
        } else {
          // Fetch user-specific stats
          const [statsRes, dailyRes] = await Promise.all([
            fetch(`${API_ENDPOINTS.usage.stats}?days=${days}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
            fetch(`${API_ENDPOINTS.usage.daily}?days=${days}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
          ]);

          if (!statsRes.ok || !dailyRes.ok) {
            throw new Error("Failed to fetch statistics");
          }

          const stats = await statsRes.json();
          const daily = await dailyRes.json();

          // Transform user stats to match admin stats format
          setAdminStats({
            totalRequests: stats.totalRequests || 0,
            successfulRequests: stats.successfulRequests || 0,
            failedRequests: stats.failedRequests || 0,
            blockedRequests: 0, // User stats don't have blocked count
            totalTokens: stats.totalTokens || 0,
            totalCost: stats.totalCost || 0,
            avgResponseTime: stats.avgResponseTime || 0,
            totalUsers: 1, // Only the current user
            activeUsers: 1,
          });

          // Transform daily data to match expected format
          const transformedDaily = daily.map((day: DailyUsageResponse) => ({
            date: day._id,
            requests: day.requests || 0,
            blocked: 0, // User stats don't track blocked requests
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

    if (user) {
      fetchStatistics();
    }
  }, [timeRange, user]);

  const totalRequests = usageData.reduce((sum, day) => sum + day.requests, 0);
  const totalBlocked = usageData.reduce((sum, day) => sum + day.blocked, 0);
  const avgRequestsPerDay = totalRequests / usageData.length;
  const blockRate = ((totalBlocked / totalRequests) * 100).toFixed(1);

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
      <div className="management-header">
        <h2>{localStorage.getItem("userRole") === "admin" ? t("statistics.adminTitle") : t("statistics.userTitle")}</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className={timeRange === "week" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setTimeRange("week")}
          >
            {t("statistics.weekButton")}
          </button>
          <button
            className={timeRange === "month" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setTimeRange("month")}
          >
            {t("statistics.monthButton")}
          </button>
          <button
            className={timeRange === "year" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setTimeRange("year")}
          >
            {t("statistics.yearButton")}
          </button>
        </div>
      </div>

      {/* System-wide statistics */}
      {adminStats && (
        <div className="dashboard-grid">
          <div className="stat-card">
            <h3>{t("userDashboard.totalRequestsLabel")}</h3>
            <p className="stat-value">{adminStats.totalRequests}</p>
            <p className="stat-change">
              {timeRange === "week" ? t("statistics.last7Days") : timeRange === "month" ? t("statistics.last30Days") : t("statistics.lastYear")}
            </p>
          </div>

          <div className="stat-card">
            <h3>{t("statistics.successfulRequestsLabel")}</h3>
            <p className="stat-value">{adminStats.successfulRequests}</p>
            <p className="stat-change positive">
              {t("statistics.successPercent", { percent: adminStats.totalRequests > 0 ? ((adminStats.successfulRequests / adminStats.totalRequests) * 100).toFixed(1) : "0" })}
            </p>
          </div>

          {localStorage.getItem("userRole") === "admin" && (
            <>
              <div className="stat-card">
                <h3>{t("userDashboard.blockedRequestsLabel")}</h3>
                <p className="stat-value">{adminStats.blockedRequests}</p>
                <p className="stat-change negative">
                  {t("userDashboard.blockedPercent", { percent: adminStats.totalRequests > 0 ? ((adminStats.blockedRequests / adminStats.totalRequests) * 100).toFixed(1) : "0" })}
                </p>
              </div>

              <div className="stat-card">
                <h3>{t("statistics.activeUsersLabel")}</h3>
                <p className="stat-value">{adminStats.activeUsers}</p>
                <p className="stat-change">{t("statistics.outOfTotal", { total: adminStats.totalUsers })}</p>
              </div>
            </>
          )}

          <div className="stat-card">
            <h3>{t("userDashboard.totalTokensLabel")}</h3>
            <p className="stat-value">{adminStats.totalTokens.toLocaleString()}</p>
            <p className="stat-change">
              {t("userDashboard.avgTokensPerRequest", { avg: Math.round(adminStats.totalTokens / (adminStats.totalRequests || 1)) })}
            </p>
          </div>

          <div className="stat-card">
            <h3>{t("userDashboard.totalCostLabel")}</h3>
            <p className="stat-value">${adminStats.totalCost.toFixed(4)}</p>
            <p className="stat-change">
              {t("statistics.avgCostPerRequest", { avg: (adminStats.totalCost / (adminStats.totalRequests || 1)).toFixed(6) })}
            </p>
          </div>

          <div className="stat-card">
            <h3>{t("userDashboard.avgResponseTimeLabel")}</h3>
            <p className="stat-value">{Math.round(adminStats.avgResponseTime)}ms</p>
          </div>

          <div className="stat-card">
            <h3>{t("statistics.dailyAverageLabel")}</h3>
            <p className="stat-value">{avgRequestsPerDay.toFixed(0)}</p>
            <p className="stat-change">{t("statistics.requestsPerDay")}</p>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: "24px" }}>
        <h3>{t("statistics.dailyBreakdownTitle")}</h3>
        <div style={{ marginTop: "16px", maxHeight: "400px", overflowY: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t("statistics.tableDate")}</th>
                <th>{t("userDashboard.requestsHeaderLabel")}</th>
                <th>{t("statistics.tableBlocked")}</th>
                <th>{t("statistics.tableSuccessRate")}</th>
              </tr>
            </thead>
            <tbody>
              {usageData.slice().reverse().map((day) => {
                const successRate = ((day.requests - day.blocked) / day.requests * 100).toFixed(1);
                return (
                  <tr key={day.date}>
                    <td>{new Date(day.date).toLocaleDateString("he-IL")}</td>
                    <td>{day.requests}</td>
                    <td>
                      <span className="badge badge-danger">{day.blocked}</span>
                    </td>
                    <td>
                      <span className={parseFloat(successRate) > 80 ? "badge badge-success" : "badge badge-warning"}>
                        {successRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {adminStats && localStorage.getItem("userRole") === "admin" && (
        <div className="card" style={{ marginTop: "24px" }}>
          <h3>{t("statistics.systemInsightsTitle")}</h3>
          <div style={{ marginTop: "16px" }}>
            <div className="alert alert-info">
              <strong>📊 {t("statistics.systemAnalysisLabel")}</strong>
              <ul style={{ marginTop: "8px", marginBottom: "0", paddingRight: "20px" }}>
                <li>{t("statistics.dailyAverageInsight", { avg: avgRequestsPerDay.toFixed(0) })}</li>
                <li>{t("statistics.blockRateInsight", { rate: blockRate })}</li>
                <li>{t("statistics.activeUsersInsight", { active: adminStats.activeUsers, total: adminStats.totalUsers, percent: adminStats.totalUsers > 0 ? ((adminStats.activeUsers / adminStats.totalUsers) * 100).toFixed(1) : "0" })}</li>
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
