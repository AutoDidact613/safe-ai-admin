import { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../../config/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface UserDashboardProps {
  user: {
    email: string;
    name: string;
    _id?: string;
    profileId?: string;
  } | null;
}

interface Profile {
  _id: string;
  name: string;
  createdBy: string;
  creatorEmail: string;
}

interface DashboardStats {
  totalRequests: number;
  successfulRequests: number;
  blockedRequests: number;
  apiKeyStatus: "active" | "inactive";
  lastActivity?: string;
}

interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  failedRequests: number;
}

interface DailyUsage {
  _id: string;
  requests: number;
  tokens: number;
  cost: number;
  avgResponseTime: number;
}

interface ModelUsage {
  _id: {
    model: string;
    provider: string;
  };
  requests: number;
  tokens: number;
  cost: number;
  avgTokensPerRequest: number;
  isFree: boolean;
}

interface LimitsStatus {
  rateLimits: {
    perMinute: {
      limit: number;
      used: number;
      remaining: number;
    };
    perDay: {
      limit: number;
      used: number;
      remaining: number;
    };
  };
  budget?: {
    monthlyLimit: number;
    currentSpent: number;
    remaining: number;
    percentUsed: number;
    lastResetDate: string;
  };
}

export default function UserDashboard({ user }: UserDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalRequests: 0,
    successfulRequests: 0,
    blockedRequests: 0,
    apiKeyStatus: "active",
  });
  const [loading, setLoading] = useState(true);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // Usage tracking state
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [modelUsage, setModelUsage] = useState<ModelUsage[]>([]);
  const [limitsStatus, setLimitsStatus] = useState<LimitsStatus | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  // Fetch usage statistics
  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        
        const [statsRes, dailyRes, modelRes, limitsRes] = await Promise.all([
          fetch(`${API_ENDPOINTS.usage.stats}?days=7`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(`${API_ENDPOINTS.usage.daily}?days=7`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(`${API_ENDPOINTS.usage.byModel}?days=30`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(API_ENDPOINTS.usage.limits, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setUsageStats(data);
          setStats({
            totalRequests: data.totalRequests,
            successfulRequests: data.successfulRequests,
            blockedRequests: data.failedRequests,
            apiKeyStatus: "active",
            lastActivity: new Date().toISOString(),
          });
        }

        if (dailyRes.ok) {
          const data = await dailyRes.json();
          setDailyUsage(data);
        }

        if (modelRes.ok) {
          const data = await modelRes.json();
          setModelUsage(data);
        }

        if (limitsRes.ok) {
          const data = await limitsRes.json();
          setLimitsStatus(data);
        }
      } catch (err) {
        console.error("Error fetching usage data:", err);
      } finally {
        setUsageLoading(false);
        setLoading(false);
      }
    };

    if (user) {
      fetchUsageData();
    }
  }, [user]);

  // Fetch current profile and all profiles
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        
        // Fetch all profiles
        const profilesResponse = await fetch(API_ENDPOINTS.profiles, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        
        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json();
          setAllProfiles(profiles);
          
          // Find current profile if user has one
          if (user?.profileId) {
            const current = profiles.find((p: Profile) => p._id === user.profileId);
            setCurrentProfile(current || null);
            setSelectedProfileId(user.profileId);
          }
        }
      } catch (err) {
        console.error("Error fetching profiles:", err);
      }
    };

    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!selectedProfileId || !user?._id) {
      setProfileError("אנא בחר פרופיל");
      return;
    }

    setSavingProfile(true);
    setProfileError(null);

    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`${API_ENDPOINTS.users}/${user._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          profileId: selectedProfileId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      const updatedUser = await response.json();
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      // Update current profile display
      const newProfile = allProfiles.find(p => p._id === selectedProfileId);
      setCurrentProfile(newProfile || null);
      setIsEditingProfile(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      setProfileError("שגיאה בשמירת הפרופיל");
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return <div className="loading-state">טוען נתונים...</div>;
  }

  return (
    <div>
      <div className="management-header">
        <h2>שלום, {user?.name || user?.email}</h2>
        <span className="badge badge-success">חשבון פעיל</span>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>סה"כ בקשות</h3>
          <p className="stat-value">{stats.totalRequests}</p>
        </div>

        <div className="stat-card">
          <h3>בקשות מאושרות</h3>
          <p className="stat-value">{stats.successfulRequests}</p>
          <p className="stat-change positive">
            {((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}% מאושרות
          </p>
        </div>

        <div className="stat-card">
          <h3>בקשות חסומות</h3>
          <p className="stat-value">{stats.blockedRequests}</p>
          <p className="stat-change negative">
            {((stats.blockedRequests / stats.totalRequests) * 100).toFixed(1)}% חסימה
          </p>
        </div>

        <div className="stat-card">
          <h3>סטטוס API Key</h3>
          <p className="stat-value">
            <span className="badge badge-success">פעיל</span>
          </p>
          <p className="stat-change">
            {stats.lastActivity && `פעילות אחרונה: ${new Date(stats.lastActivity).toLocaleString("he-IL")}`}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>פרטי חשבון</h3>
        </div>
        <div style={{ marginTop: "16px" }}>
          <div className="item-detail">
            <span className="item-detail-label">אימייל:</span>
            <span className="item-detail-value">{user?.email}</span>
          </div>
          <div className="item-detail">
            <span className="item-detail-label">שם:</span>
            <span className="item-detail-value">{user?.name}</span>
          </div>
          <div className="item-detail">
            <span className="item-detail-label">מזהה משתמש:</span>
            <span className="item-detail-value">{user?._id || "N/A"}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>פרופיל AI</h3>
          {!isEditingProfile && (
            <button
              onClick={() => setIsEditingProfile(true)}
              className="btn btn-secondary"
              style={{ padding: "8px 16px", fontSize: "14px" }}
            >
              ערוך פרופיל
            </button>
          )}
        </div>

        {!isEditingProfile ? (
          <div style={{ marginTop: "16px" }}>
            {currentProfile ? (
              <>
                <div className="item-detail">
                  <span className="item-detail-label">פרופיל נוכחי:</span>
                  <span className="item-detail-value">
                    <span className="badge badge-primary">{currentProfile.name}</span>
                  </span>
                </div>
                <div className="item-detail">
                  <span className="item-detail-label">נוצר על ידי:</span>
                  <span className="item-detail-value">{currentProfile.creatorEmail}</span>
                </div>
              </>
            ) : (
              <div className="alert alert-warning">
                <strong>⚠️ לא נבחר פרופיל</strong>
                <p style={{ marginTop: "8px", marginBottom: 0 }}>
                  אנא בחר פרופיל AI כדי להתחיל להשתמש במערכת.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: "16px" }}>
            <div className="form-group">
              <label htmlFor="profile-select">בחר פרופיל:</label>
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
                <option value="">-- בחר פרופיל --</option>
                {allProfiles.map((profile) => (
                  <option key={profile._id} value={profile._id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>

            {profileError && (
              <div className="alert alert-error" style={{ marginTop: "12px" }}>
                {profileError}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button
                onClick={handleSaveProfile}
                disabled={!selectedProfileId || savingProfile}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {savingProfile ? "שומר..." : "שמור"}
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
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Usage Statistics Section */}
      {usageStats && (
        <>
          <div className="card" style={{ marginTop: "24px" }}>
            <h3>סטטיסטיקות שימוש (7 ימים אחרונים)</h3>
            <div className="dashboard-grid" style={{ marginTop: "16px" }}>
              <div className="stat-card">
                <h4>סה"כ Tokens</h4>
                <p className="stat-value">{usageStats.totalTokens.toLocaleString()}</p>
                <p className="stat-change">ממוצע: {Math.round(usageStats.totalTokens / (usageStats.totalRequests || 1))} לבקשה</p>
              </div>
              <div className="stat-card">
                <h4>זמן תגובה ממוצע</h4>
                <p className="stat-value">{Math.round(usageStats.avgResponseTime)}ms</p>
              </div>
              <div className="stat-card">
                <h4>עלות כוללת</h4>
                <p className="stat-value">${usageStats.totalCost.toFixed(4)}</p>
              </div>
              <div className="stat-card">
                <h4>שיעור הצלחה</h4>
                <p className="stat-value">
                  {((usageStats.successfulRequests / (usageStats.totalRequests || 1)) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Daily Usage Chart */}
          {dailyUsage.length > 0 && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h3>שימוש יומי</h3>
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
                    name="בקשות"
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
              <h3>שימוש לפי מודל (30 ימים אחרונים)</h3>
              <div style={{ overflowX: "auto", marginTop: "16px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #ddd" }}>
                      <th style={{ padding: "12px", textAlign: "right" }}>מודל</th>
                      <th style={{ padding: "12px", textAlign: "right" }}>ספק</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>בקשות</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>Tokens</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>עלות</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>חינמי</th>
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
              <h3>מצב Rate Limits</h3>
              <div style={{ marginTop: "16px" }}>
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span>בקשות לדקה:</span>
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
                    <span>בקשות ליום:</span>
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
                      <span>תקציב חודשי:</span>
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
                      נותרו: ${limitsStatus.budget.remaining.toFixed(4)} ({(100 - limitsStatus.budget.percentUsed).toFixed(1)}%)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {usageLoading && (
        <div className="card" style={{ marginTop: "24px", textAlign: "center", padding: "40px" }}>
          <p>טוען סטטיסטיקות שימוש...</p>
        </div>
      )}

      <div className="alert alert-info" style={{ marginTop: "24px" }}>
        <strong>💡 טיפ:</strong> הסטטיסטיקות מתעדכנות בזמן אמת ומציגות את השימוש שלך ב-7-30 הימים האחרונים.
      </div>
    </div>
  );
}
