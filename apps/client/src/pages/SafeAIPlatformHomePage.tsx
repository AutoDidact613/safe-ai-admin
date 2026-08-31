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

interface ProviderKey {
  _id: string;
  userId?: string;
  isActive: boolean;
}

interface NewsItem {
  _id: string;
  title: string;
  createdAt: string;
}

const SIDEBAR_ITEMS = [
  { key: "docs", icon: <DocIcon size={18} />, label: "תיעוד", path: "/docs" },
  { key: "api-keys", icon: <KeyIcon size={18} />, label: "מפתחות API", path: "/api-key-display" },
  { key: "personal-area", icon: <UserIcon size={18} />, label: "אזור אישי", path: "/safeai-ui" },
  { key: "contact", icon: <MailIcon size={18} />, label: "צור קשר", path: "/contact" },
];

export default function SafeAIPlatformHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [usageFailed, setUsageFailed] = useState(false);
  const [usageLoading, setUsageLoading] = useState(true);

  const [activeKeysCount, setActiveKeysCount] = useState<number | null>(null);
  const [keysFailed, setKeysFailed] = useState(false);
  const [keysLoading, setKeysLoading] = useState(true);

  const [newsItems, setNewsItems] = useState<FeedItem[]>([]);
  const [newsFailed, setNewsFailed] = useState(false);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    apiCall<UsageStats>(API_ENDPOINTS.usage.stats)
      .then(setUsage)
      .catch(() => setUsageFailed(true))
      .finally(() => setUsageLoading(false));
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
        <div className="dash-checklist">
          <ChecklistStep step={1} label="צור מפתח API" done={!keysLoading && !!activeKeysCount} path="/api-key-display" />
          <ChecklistStep step={2} label="בצע קריאה ראשונה" done={!usageLoading && !!usage?.totalRequests} path="/docs" />
        </div>

        <div className="dash-stats-row">
          <StatTile label="בקשות (7 ימים אחרונים)" value={usage?.totalRequests ?? null} loading={usageLoading} failed={usageFailed} />
          <StatTile label="טוקנים בשימוש" value={usage?.totalTokens ?? null} loading={usageLoading} failed={usageFailed} />
          <StatTile label="מפתחות API פעילים" value={activeKeysCount} loading={keysLoading} failed={keysFailed} />
        </div>

        <div className="dash-feeds">
          <FeedList title="עדכונים אחרונים" items={newsItems} loading={newsLoading} failed={newsFailed} emptyLabel="אין עדכונים חדשים כרגע." />
        </div>
      </div>
    </div>
  );
}
