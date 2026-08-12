import { useState, useEffect } from "react";
import { API_ENDPOINTS, apiCall } from "../../config/api";
import { useUsageData } from "../../hooks/useUsageData";
import { useProfiles, type Profile } from "../../hooks/useProfiles";
import { useAuth } from "../../context/authStore";
import BudgetCard from "./BudgetCard";
import UsageChart from "./UsageChart";

interface UserDashboardProps {
  user: {
    email: string;
    name: string;
    _id?: string;
    profileId?: string;
  } | null;
}

export default function UserDashboard({ user }: UserDashboardProps) {
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
    if (!selectedProfileId || !user?._id) { setProfileError("אנא בחר פרופיל"); return; }
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
      setProfileError("שגיאה בשמירת הפרופיל");
    } finally {
      setSavingProfile(false);
    }
  };

  const totalRequests = usageStats?.totalRequests ?? 0;
  const successfulRequests = usageStats?.successfulRequests ?? 0;
  const blockedRequests = usageStats?.failedRequests ?? 0;

  if (usageLoading) return <div className="loading-state">טוען נתונים...</div>;

  return (
    <div>
      <div className="management-header">
        <h2>שלום, {user?.name || user?.email}</h2>
        <span className="badge badge-success">חשבון פעיל</span>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>סה"כ בקשות</h3>
          <p className="stat-value">{totalRequests}</p>
        </div>
        <div className="stat-card">
          <h3>בקשות מאושרות</h3>
          <p className="stat-value">{successfulRequests}</p>
          <p className="stat-change positive">
            {(totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0).toFixed(1)}% מאושרות
          </p>
        </div>
        <div className="stat-card">
          <h3>בקשות חסומות</h3>
          <p className="stat-value">{blockedRequests}</p>
          <p className="stat-change negative">
            {(totalRequests > 0 ? (blockedRequests / totalRequests) * 100 : 0).toFixed(1)}% חסימה
          </p>
        </div>
        <div className="stat-card">
          <h3>סטטוס API Key</h3>
          <p className="stat-value"><span className="badge badge-success">פעיל</span></p>
        </div>
      </div>

      {/* Account details */}
      <div className="card" style={{ marginTop: "24px" }}>
        <h3>פרטי חשבון</h3>
        <div style={{ marginTop: "16px" }}>
          <div className="item-detail"><span className="item-detail-label">אימייל:</span><span className="item-detail-value">{user?.email}</span></div>
          <div className="item-detail"><span className="item-detail-label">שם:</span><span className="item-detail-value">{user?.name}</span></div>
          <div className="item-detail"><span className="item-detail-label">מזהה משתמש:</span><span className="item-detail-value">{user?._id || "N/A"}</span></div>
        </div>
      </div>

      {/* AI Profile */}
      <div className="card" style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>פרופיל AI</h3>
          {!isEditingProfile && (
            <button onClick={() => setIsEditingProfile(true)} className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "14px" }}>
              ערוך פרופיל
            </button>
          )}
        </div>

        {!isEditingProfile ? (
          <div style={{ marginTop: "16px" }}>
            {currentProfile ? (
              <>
                <div className="item-detail"><span className="item-detail-label">פרופיל נוכחי:</span><span className="item-detail-value"><span className="badge badge-primary">{currentProfile.name}</span></span></div>
                <div className="item-detail"><span className="item-detail-label">נוצר על ידי:</span><span className="item-detail-value">{currentProfile.creatorEmail}</span></div>
              </>
            ) : (
              <div className="alert alert-warning">
                <strong>⚠️ לא נבחר פרופיל</strong>
                <p style={{ marginTop: "8px", marginBottom: 0 }}>אנא בחר פרופיל AI כדי להתחיל להשתמש במערכת.</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: "16px" }}>
            <div className="form-group">
              <label htmlFor="profile-select">בחר פרופיל:</label>
              <select id="profile-select" value={selectedProfileId} onChange={(e) => setSelectedProfileId(e.target.value)}
                style={{ width: "100%", padding: "12px", fontSize: "16px", borderRadius: "5px", border: "1px solid #ddd", marginTop: "8px", backgroundColor: "#f8f9fa" }}>
                <option value="">-- בחר פרופיל --</option>
                {allProfiles.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            {profileError && <div className="alert alert-error" style={{ marginTop: "12px" }}>{profileError}</div>}
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button onClick={handleSaveProfile} disabled={!selectedProfileId || savingProfile} className="btn btn-primary" style={{ flex: 1 }}>
                {savingProfile ? "שומר..." : "שמור"}
              </button>
              <button onClick={() => { setIsEditingProfile(false); setSelectedProfileId(user?.profileId ?? ""); setProfileError(null); }} className="btn btn-secondary" style={{ flex: 1 }}>
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>

      {usageStats && <UsageChart usageStats={usageStats} dailyUsage={dailyUsage} modelUsage={modelUsage} />}
      {limitsStatus && <BudgetCard limitsStatus={limitsStatus} />}

      <div className="alert alert-info" style={{ marginTop: "24px" }}>
        <strong>💡 טיפ:</strong> הסטטיסטיקות מתעדכנות בזמן אמת ומציגות את השימוש שלך ב-7-30 הימים האחרונים.
      </div>
    </div>
  );
}
