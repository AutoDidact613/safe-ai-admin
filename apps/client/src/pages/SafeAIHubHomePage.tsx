import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/landing-page-v2.css";
import "../styles/dashboard-pages.css";
import { useAuth } from "../context/authStore";
import { API_ENDPOINTS, apiCall } from "../config/api";
import { ChatIcon, BookIcon, CompassIcon, ClipboardIcon, NewsIcon } from "../features/landing/icons";
import DashboardSidebar from "../features/dashboard/DashboardSidebar";
import FeedList, { type FeedItem } from "../features/dashboard/FeedList";

interface ForumPost {
  _id: string;
  title: string;
  author: { name: string };
  createdAt: string;
}

interface ForumPostsResponse {
  posts: ForumPost[];
}

interface NewsItem {
  _id: string;
  title: string;
  createdAt: string;
}

const SIDEBAR_ITEMS = [
  { key: "forum", icon: <ChatIcon size={18} />, label: "פורום", path: "/forum" },
  { key: "courses", icon: <BookIcon size={18} />, label: "קורסים", path: "/courses" },
  { key: "guides", icon: <CompassIcon size={18} />, label: "מדריכים מומלצים", path: "/recommended-guides" },
  { key: "tenders", icon: <ClipboardIcon size={18} />, label: "לוח פרויקטים", path: "/tender-board" },
  { key: "news", icon: <NewsIcon size={18} />, label: "חדשות AI", path: "/ai-news" },
];

export default function SafeAIHubHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [postItems, setPostItems] = useState<FeedItem[]>([]);
  const [postsFailed, setPostsFailed] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);

  const [newsItems, setNewsItems] = useState<FeedItem[]>([]);
  const [newsFailed, setNewsFailed] = useState(false);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    const role = user?.role || "user";
    apiCall<ForumPostsResponse>(`${API_ENDPOINTS.posts}?page=1&userRole=${role}`)
      .then((data) =>
        setPostItems(
          (data.posts || []).slice(0, 3).map((post) => ({
            id: post._id,
            title: post.title,
            meta: `${post.author?.name || "משתמש"} · ${new Date(post.createdAt).toLocaleDateString("he-IL")}`,
            onClick: () => navigate(`/forum/post/${post._id}`),
          })),
        ),
      )
      .catch(() => setPostsFailed(true))
      .finally(() => setPostsLoading(false));
  }, [navigate, user?.role]);

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
      <DashboardSidebar homeLabel="SafeAI Hub" items={SIDEBAR_ITEMS} />

      <div className="dash-main">
        <span className="dash-eyebrow">SafeAI Hub</span>
        <h1 className="dash-title">שלום{user?.name ? `, ${user.name}` : ""}</h1>
        <p className="dash-subtitle">כל המשאבים למתכנתים במקום אחד — פורום, קורסים, מדריכים, פרויקטים וחדשות.</p>

        <div className="dash-feeds">
          <FeedList title="פוסטים אחרונים בפורום" items={postItems} loading={postsLoading} failed={postsFailed} emptyLabel="אין עדיין פוסטים בפורום." />
          <FeedList title="חדשות AI אחרונות" items={newsItems} loading={newsLoading} failed={newsFailed} emptyLabel="אין עדכונים חדשים כרגע." />
        </div>
      </div>
    </div>
  );
}
