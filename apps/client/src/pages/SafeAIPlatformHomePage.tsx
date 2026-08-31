import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/landing-page-v2.css";
import "../styles/dashboard-pages.css";
import { useAuth } from "../context/authStore";
import { API_ENDPOINTS, apiCall } from "../config/api";
import { DocIcon, MailIcon, UserIcon, KeyIcon } from "../features/landing/icons";
import DashboardSidebar from "../features/dashboard/DashboardSidebar";
import ChecklistStep from "../features/dashboard/ChecklistStep";
import StatTile from "../features/dashboard/StatTile";
import FeedList, { type FeedItem } from "../features/dashboard/FeedList";

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
}

interface DailyUsage {
  _id: string;
  requests: number;
  tokens: number;
}

interface ProviderKey {
  _id: string;
  userId?: string;
  isActive: boolean;
}

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
}

const SIDEBAR_ITEMS = [
  { key: "docs", icon: <DocIcon size={18} />, label: "תיעוד", path: "/docs" },
  { key: "api-keys", icon: <KeyIcon size={18} />, label: "מפתחות API", path: "/api-key-display" },
  { key: "personal-area", icon: <UserIcon size={18} />, label: "אזור אישי", path: "/safeai-ui" },
  { key: "contact", icon: <MailIcon size={18} />, label: "צור קשר", path: "/contact" },
];

// GET /usage/daily only returns rows for days that actually had usage — days
// with none are simply absent. Fill the gaps with 0 so the sparkline always
// gets one point per one of the last 7 calendar days, in order.
function buildLast7DaySeries(daily: DailyUsage[], key: "requests" | "tokens"): number[] {
  const byDate = new Map(daily.map((entry) => [entry._id, entry[key]]));
  const series: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    series.push(byDate.get(date.toISOString().slice(0, 10)) ?? 0);
  }
  return series;
}

export default function SafeAIPlatformHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [usageFailed, setUsageFailed] = useState(false);
  const [usageLoading, setUsageLoading] = useState(true);

  const [requestsTrend, setRequestsTrend] = useState<number[] | undefined>(undefined);
  const [tokensTrend, setTokensTrend] = useState<number[] | undefined>(undefined);

  const [activeKeysCount, setActiveKeysCount] = useState<number | null>(null);
  const [keysFailed, setKeysFailed] = useState(false);
  const [keysLoading, setKeysLoading] = useState(true);

  const [newsItems, setNewsItems] = useState<FeedItem[]>([]);
  const [newsFailed, setNewsFailed] = useState(false);
  const [newsLoading, setNewsLoading] = useState(true);

  // All three stat tiles reveal together once every source they depend on
  // has settled — one still loading would otherwise leave the row popping
  // in one tile at a time as each request happens to resolve.
  const statsRowLoading = usageLoading || keysLoading;

  useEffect(() => {
    apiCall<UsageStats>(API_ENDPOINTS.usage.stats)
      .then(setUsage)
      .catch(() => setUsageFailed(true))
      .finally(() => setUsageLoading(false));
  }, []);

  useEffect(() => {
    apiCall<DailyUsage[]>(API_ENDPOINTS.usage.daily)
      .then((daily) => {
        setRequestsTrend(buildLast7DaySeries(daily, "requests"));
        setTokensTrend(buildLast7DaySeries(daily, "tokens"));
      })
      .catch(() => {
        // Sparklines are a decorative addition — if the daily breakdown fails
        // to load, the tiles just fall back to showing no trend line.
      });
  }, []);

  useEffect(() => {
    if (!user?._id) return;
    apiCall<ProviderKey[]>(API_ENDPOINTS.providerKeys)
      .then((keys) => setActiveKeysCount(keys.filter((k) => k.userId === user._id && k.isActive).length))
      .catch(() => setKeysFailed(true))
      .finally(() => setKeysLoading(false));
  }, [user?._id]);

  useEffect(() => {
    apiCall<NewsItem[]>(`${API_ENDPOINTS.news}?limit=3`)
      .then((items) =>
        setNewsItems(
          items.map((item) => ({
            id: item._id,
            title: item.title,
            meta: new Date(item.createdAt).toLocaleDateString("he-IL"),
            onClick: () => navigate(`/ai-news/${item._id}`),
          })),
        ),
      )
      .catch(() => setNewsFailed(true))
      .finally(() => setNewsLoading(false));
  }, [navigate]);

  return (
    <div className="landing-v2 dash-page" dir="rtl">
      <DashboardSidebar homeLabel="SafeAI Platform" items={SIDEBAR_ITEMS} />

      <div className="dash-main">
        <span className="dash-eyebrow">SafeAI Platform</span>
        <h1 className="dash-title">שלום{user?.name ? `, ${user.name}` : ""}</h1>
        <p className="dash-subtitle">כל מה שצריך לניהול השימוש שלך ב-SafeAI API Platform במקום אחד.</p>

        <h2 className="dash-section-title">בואו נתחיל</h2>
        <div className="dash-getstarted-card">
          <ChecklistStep
            step={1}
            label="צור מפתח API"
            description="נדרש כדי לבצע קריאות ל-API"
            done={!keysLoading && !!activeKeysCount}
            path="/api-key-display"
          />
          <ChecklistStep
            step={2}
            label="בצע קריאה ראשונה"
            description="לפי המדריך בתיעוד"
            done={!usageLoading && !!usage?.totalRequests}
            path="/docs"
          />
        </div>

        <div className="dash-stats-row">
          <StatTile
            label="בקשות (7 ימים אחרונים)"
            value={usage?.totalRequests ?? null}
            loading={statsRowLoading}
            failed={usageFailed}
            trend={requestsTrend}
          />
          <StatTile
            label="טוקנים בשימוש"
            value={usage?.totalTokens ?? null}
            loading={statsRowLoading}
            failed={usageFailed}
            trend={tokensTrend}
          />
          <StatTile label="מפתחות API פעילים" value={activeKeysCount} loading={statsRowLoading} failed={keysFailed} />
        </div>

        <div className="dash-feeds">
          <FeedList title="עדכונים אחרונים" items={newsItems} loading={newsLoading} failed={newsFailed} emptyLabel="אין עדכונים חדשים כרגע." />
        </div>
      </div>
    </div>
  );
}
