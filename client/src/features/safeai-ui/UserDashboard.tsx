import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { API_ENDPOINTS, apiCall } from "../../config/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { useUsageData } from "../../hooks/useUsageData";
import { useProfiles, type Profile } from "../../hooks/useProfiles";
import { useAuth } from "../../context/useAuth";

interface UserDashboardProps {
  user: {
    email: string;
    name: string;
    _id?: string;
    profileId?: string;
  } | null;
}

export default function UserDashboard({ user }: UserDashboardProps) {
  const { t } = useTranslation();
  const { setUser } = useAuth();
  const { usageStats, dailyUsage, modelUsage, limitsStatus, loading: usageLoading } = useUsageData(!!user);
  const { profiles: allProfiles } = useProfiles();
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(user?.profileId ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Fetch fresh user data to ensure profileId is up-to-date (localStorage may be stale)
  useEffect(() => {
    const controller = new AbortController();
    apiCall<{ user: Record<string, unknown> }>(API_ENDPOINTS.auth.me, { signal: controller.signal })
      .then((res) => {
        if (!res?.user) return;
        const u = res.user;
        // profileId may be a populated object — normalize to its _id string
        const profileId =
          u.profileId && typeof u.profileId === "object"
            ? String((u.profileId as { _id: unknown })._id)
            : (u.profileId as string | undefined);
        setUser({ ...(u as unknown as Parameters<typeof setUser>[0]), profileId });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [setUser]);

  useEffect(() => {
    if (user?.profileId && allProfiles.length > 0) {
      const current = allProfiles.find(p => p._id === user.profileId);
      setCurrentProfile(current ?? null);
      setSelectedProfileId(user.profileId);
    }
  }, [allProfiles, user?.profileId]);

  const handleSaveProfile = async () => {
    if (!selectedProfileId || !user?._id) {
      setProfileError(t("profileModal.errorSelectProfile"));
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    try {
      const updatedUser = await apiCall<typeof user>(`${API_ENDPOINTS.users}/${user._id}`, {
        method: "PATCH",
        body: JSON.stringify({ profileId: selectedProfileId }),
      });
      if (updatedUser) setUser(updatedUser);
      setCurrentProfile(allProfiles.find(p => p._id === selectedProfileId) ?? null);
      setIsEditingProfile(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      setProfileError(t("profileModal.errorSavingProfile"));
    } finally {
      setSavingProfile(false);
    }
  };

  if (usageLoading) {
    return <div className="loading-state">{t("userDashboard.loadingData")}</div>;
  }

  const totalRequests = usageStats?.totalRequests ?? 0;
  const successfulRequests = usageStats?.successfulRequests ?? 0;
  const blockedRequests = usageStats?.failedRequests ?? 0;

  return (
    <div>
      <div className="management-header">
        <h2>{t("userDashboard.greeting", { name: user?.name || user?.email })}</h2>
        <span className="badge badge-success">{t("userDashboard.activeAccountBadge")}</span>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>{t("userDashboard.totalRequestsLabel")}</h3>
          <p className="stat-value">{totalRequests}</p>
        </div>
        <div className="stat-card">
          <h3>{t("userDashboard.successfulRequestsLabel")}</h3>
          <p className="stat-value">{successfulRequests}</p>
          <p className="stat-change positive">
            {t("userDashboard.successfulPercent", { percent: (totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0).toFixed(1) })}
          </p>
        </div>
        <div className="stat-card">
          <h3>{t("userDashboard.blockedRequestsLabel")}</h3>
          <p className="stat-value">{blockedRequests}</p>
          <p className="stat-change negative">
            {t("userDashboard.blockedPercent", { percent: (totalRequests > 0 ? (blockedRequests / totalRequests) * 100 : 0).toFixed(1) })}
          </p>
        </div>
        <div className="stat-card">
          <h3>{t("userDashboard.apiKeyStatusLabel")}</h3>
          <p className="stat-value">
            <span className="badge badge-success">{t("orgUsers.active")}</span>
          </p>
        </div>
      </div>

      {/* Account details */}
      <div className="card" style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>{t("userDashboard.accountDetailsTitle")}</h3>
        </div>
        <div style={{ marginTop: "16px" }}>
          <div className="item-detail">
            <span className="item-detail-label">{t("profileModal.labelEmail")}</span>
            <span className="item-detail-value" dir="ltr">{user?.email}</span>
          </div>
          <div className="item-detail">
            <span className="item-detail-label">{t("profileModal.labelName")}</span>
            <span className="item-detail-value">{user?.name}</span>
          </div>
          <div className="item-detail">
            <span className="item-detail-label">{t("userDashboard.userIdLabel")}</span>
            <span className="item-detail-value" dir="ltr">{user?._id || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* AI Profile */}
      <div className="card" style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>{t("userDashboard.aiProfileTitle")}</h3>
          {!isEditingProfile && (
            <button
              onClick={() => setIsEditingProfile(true)}
              className="btn btn-secondary"
              style={{ padding: "8px 16px", fontSize: "14px" }}
            >
              {t("userDashboard.editProfileButton")}
            </button>
          )}
        </div>

        {!isEditingProfile ? (
          <div style={{ marginTop: "16px" }}>
            {currentProfile ? (
              <>
                <div className="item-detail">
                  <span className="item-detail-label">{t("userDashboard.currentProfileLabel")}</span>
                  <span className="item-detail-value">
                    <span className="badge badge-primary">{currentProfile.name}</span>
                  </span>
                </div>
                <div className="item-detail">
                  <span className="item-detail-label">{t("profileModal.labelCreatedBy")}</span>
                  <span className="item-detail-value">{currentProfile.creatorEmail}</span>
                </div>
              </>
            ) : (
              <div className="alert alert-warning">
                <strong>⚠️ {t("userDashboard.noProfileSelectedWarning")}</strong>
                <p style={{ marginTop: "8px", marginBottom: 0 }}>
                  {t("userDashboard.selectProfilePrompt")}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: "16px" }}>
            <div className="form-group">
              <label htmlFor="profile-select">{t("profileModal.selectLabel")}</label>
              <select
                id="profile-select"
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "16px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                  marginTop: "8px",
                  backgroundColor: "#f8f9fa",
                }}
              >
                <option value="">{t("profileModal.selectPlaceholder")}</option>
                {allProfiles.map((profile) => (
                  <option key={profile._id} value={profile._id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>
            {profileError && <div className="alert alert-error" style={{ marginTop: "12px" }}>{profileError}</div>}
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button
                onClick={handleSaveProfile}
                disabled={!selectedProfileId || savingProfile}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {savingProfile ? t("profileModal.buttonSaving") : t("common.save")}
              </button>
              <button
                onClick={() => {
                  setIsEditingProfile(false);
                  setSelectedProfileId(user?.profileId || "");
                  setProfileError(null);
                }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Usage Statistics Section */}
      {usageStats && (
        <>
          <div className="card" style={{ marginTop: "24px" }}>
            <h3>{t("userDashboard.usageStatsTitle")}</h3>
            <div className="dashboard-grid" style={{ marginTop: "16px" }}>
              <div className="stat-card">
                <h4>{t("userDashboard.totalTokensLabel")}</h4>
                <p className="stat-value">{usageStats.totalTokens.toLocaleString()}</p>
                <p className="stat-change">{t("userDashboard.avgTokensPerRequest", { avg: Math.round(usageStats.totalTokens / (usageStats.totalRequests || 1)) })}</p>
              </div>
              <div className="stat-card">
                <h4>{t("userDashboard.avgResponseTimeLabel")}</h4>
                <p className="stat-value">{Math.round(usageStats.avgResponseTime)}ms</p>
              </div>
              <div className="stat-card">
                <h4>{t("userDashboard.totalCostLabel")}</h4>
                <p className="stat-value">${usageStats.totalCost.toFixed(4)}</p>
              </div>
              <div className="stat-card">
                <h4>{t("userDashboard.successRateLabel")}</h4>
                <p className="stat-value">
                  {((usageStats.successfulRequests / (usageStats.totalRequests || 1)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Daily Usage Chart */}
          {dailyUsage.length > 0 && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h3>{t("userDashboard.dailyUsageTitle")}</h3>
              <ResponsiveContainer width="100%" height={300} style={{ marginTop: "16px" }}>
                <LineChart data={dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="_id" 
                    tickFormatter={(value) => format(new Date(value), "dd/MM")}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value as string), "dd/MM/yyyy")}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="requests"
                    stroke="#8884d8"
                    name={t("userDashboard.chartRequestsLabel")}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="tokens" 
                    stroke="#82ca9d" 
                    name="Tokens"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Model Usage Table */}
          {modelUsage.length > 0 && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h3>{t("userDashboard.modelUsageTitle")}</h3>
              <div style={{ overflowX: "auto", marginTop: "16px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #ddd" }}>
                      <th style={{ padding: "12px", textAlign: "right" }}>{t("userDashboard.modelHeaderLabel")}</th>
                      <th style={{ padding: "12px", textAlign: "right" }}>{t("userDashboard.providerHeaderLabel")}</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>{t("userDashboard.requestsHeaderLabel")}</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>Tokens</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>{t("userDashboard.costHeaderLabel")}</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>{t("userDashboard.freeHeaderLabel")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelUsage.map((model, index) => (
                      <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "12px" }}>{model._id.model}</td>
                        <td style={{ padding: "12px" }}>
                          <span className="badge badge-secondary">{model._id.provider}</span>
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>{model.requests}</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          {model.tokens.toLocaleString()}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          ${model.cost.toFixed(4)}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          {model.isFree ? "✅" : "❌"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rate Limits Status */}
          {limitsStatus && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h3>{t("userDashboard.rateLimitsTitle")}</h3>
              <div style={{ marginTop: "16px" }}>
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span>{t("userDashboard.perMinuteLabel")}</span>
                    <span>
                      {limitsStatus.rateLimits.perMinute.used} / {limitsStatus.rateLimits.perMinute.limit}
                    </span>
                  </div>
                  <div style={{ 
                    width: "100%", 
                    height: "20px", 
                    backgroundColor: "#e0e0e0", 
                    borderRadius: "10px",
                    overflow: "hidden"
                  }}>
                    <div style={{ 
                      width: `${(limitsStatus.rateLimits.perMinute.used / limitsStatus.rateLimits.perMinute.limit) * 100}%`,
                      height: "100%",
                      backgroundColor: limitsStatus.rateLimits.perMinute.used / limitsStatus.rateLimits.perMinute.limit > 0.9 ? "#f44336" : 
                                      limitsStatus.rateLimits.perMinute.used / limitsStatus.rateLimits.perMinute.limit > 0.7 ? "#ff9800" : "#4caf50",
                      transition: "width 0.3s ease"
                    }} />
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span>{t("userDashboard.perDayLabel")}</span>
                    <span>
                      {limitsStatus.rateLimits.perDay.used} / {limitsStatus.rateLimits.perDay.limit}
                    </span>
                  </div>
                  <div style={{ 
                    width: "100%", 
                    height: "20px", 
                    backgroundColor: "#e0e0e0", 
                    borderRadius: "10px",
                    overflow: "hidden"
                  }}>
                    <div style={{ 
                      width: `${(limitsStatus.rateLimits.perDay.used / limitsStatus.rateLimits.perDay.limit) * 100}%`,
                      height: "100%",
                      backgroundColor: limitsStatus.rateLimits.perDay.used / limitsStatus.rateLimits.perDay.limit > 0.9 ? "#f44336" : 
                                      limitsStatus.rateLimits.perDay.used / limitsStatus.rateLimits.perDay.limit > 0.7 ? "#ff9800" : "#4caf50",
                      transition: "width 0.3s ease"
                    }} />
                  </div>
                </div>

                {limitsStatus.budget && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span>{t("userDashboard.monthlyBudgetLabel")}</span>
                      <span>
                        ${limitsStatus.budget.currentSpent.toFixed(4)} / ${limitsStatus.budget.monthlyLimit.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ 
                      width: "100%", 
                      height: "20px", 
                      backgroundColor: "#e0e0e0", 
                      borderRadius: "10px",
                      overflow: "hidden"
                    }}>
                      <div style={{ 
                        width: `${limitsStatus.budget.percentUsed}%`,
                        height: "100%",
                        backgroundColor: limitsStatus.budget.percentUsed > 90 ? "#f44336" : 
                                        limitsStatus.budget.percentUsed > 70 ? "#ff9800" : "#4caf50",
                        transition: "width 0.3s ease"
                      }} />
                    </div>
                    <p style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}>
                      {t("userDashboard.remainingBudget", { amount: limitsStatus.budget.remaining.toFixed(4), percent: (100 - limitsStatus.budget.percentUsed).toFixed(1) })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div className="alert alert-info" style={{ marginTop: "24px" }}>
        <strong>💡 {t("userDashboard.tipLabel")}</strong> {t("userDashboard.tipText")}
      </div>
    </div>
  );
}
