import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_ENDPOINTS, apiCall } from "../config/api";
import "../styles/news-page.css";

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  source?: string;
  tags?: string[];
  imageUrl?: string;
  createdAt?: string;
}

export default function AiNewsDetailsPage() {
  const { id } = useParams();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const data = await apiCall<NewsItem>(`${API_ENDPOINTS.news}/${id}`);
        setNews(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה בטעינת הכתבה");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  useEffect(() => {
    if (news) {
      document.title = news.title;
    }
  }, [news]);

  if (loading) {
    return (
      <div className="news-loading-container">
        <div className="news-loading-content">
          <div className="news-spinner" />
          <div className="news-loading-text">טוען...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="news-details-page">
        <div className="news-details-container">
          <div className="news-error-message">{error}</div>
        </div>
      </div>
    );
  }

  if (!news) {
    return <Navigate to="/ai-news" replace />;
  }

  return (
    <div className="news-details-page">
      <div className="news-details-container">
        <Link to="/ai-news" className="news-back-link">
          → חזרה לחדשות
        </Link>

        {news.tags?.length ? (
          <div className="news-details-eyebrow">
            {news.tags.map((tag) => (
              <span key={tag} className="news-tag">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <h1 className="news-header-title">{news.title}</h1>

        <div className="news-byline">
          <span className="news-byline-source">{news.source || "User"}</span>
          <span className="news-byline-dot">·</span>
          <span>{new Date(news.createdAt || "").toLocaleDateString("he-IL", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}</span>
        </div>

        {news.imageUrl && (
          <img src={news.imageUrl} alt={news.title} className="news-details-image" />
        )}

        <div className="news-article-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{news.content}</ReactMarkdown>
        </div>

        <div className="news-details-footer">
          <Link to="/ai-news" className="btn-reset">
            חזרה לחדשות
          </Link>
        </div>
      </div>
    </div>
  );
}
