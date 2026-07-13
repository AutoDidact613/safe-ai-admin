import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiCall, API_ENDPOINTS } from "../config/api";
import "./articles-page.css";

interface Article {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  createdAt: string;
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async (signal: AbortSignal) => {
    try {
      setLoading(true);
      const data = await apiCall<{ success: boolean; articles: Article[] }>(
        API_ENDPOINTS.articles.list,
        { signal }
      );
      setArticles(data.articles);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("שגיאה בטעינת המאמרים");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const filtered = articles.filter(
    (a) =>
      !search.trim() ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(articles.map((a) => a.category))];

  return (
    <div className="articles-page" dir="rtl">
      <div className="articles-header">
        <h1>📚 Docs</h1>
        <p className="articles-subtitle">מרכז הידע של SafeAI</p>
      </div>

      <div className="articles-search">
        <input
          type="text"
          placeholder="חיפוש מאמרים..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="articles-search-input"
        />
      </div>

      {loading && <div className="articles-loading">טוען מאמרים...</div>}
      {error && <div className="articles-error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="articles-empty">
          {search ? `לא נמצאו מאמרים עבור "${search}"` : "אין מאמרים עדיין"}
        </div>
      )}

      {!loading && categories.map((cat) => {
        const catArticles = filtered.filter((a) => a.category === cat);
        if (catArticles.length === 0) return null;
        return (
          <div key={cat} className="articles-category-section">
            <h2 className="articles-category-title">{cat}</h2>
            <div className="articles-grid">
              {catArticles.map((article) => (
                <Link
                  key={article._id}
                  to={`/docs/${article.slug}`}
                  className="article-card"
                >
                  <div className="article-card-category">{article.category}</div>
                  <h3 className="article-card-title">{article.title}</h3>
                  {article.description && (
                    <p className="article-card-description">{article.description}</p>
                  )}
                  <div className="article-card-footer">
                    <span className="article-card-date">
                      {new Date(article.createdAt).toLocaleDateString("he-IL")}
                    </span>
                    <span className="article-card-link">קרא עוד ←</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}