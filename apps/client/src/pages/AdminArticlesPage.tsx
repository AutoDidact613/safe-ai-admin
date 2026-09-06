import { useEffect, useState, useCallback } from "react";
import { apiCall, API_ENDPOINTS } from "../config/api";
import "./admin-articles-page.css";

interface Article {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  published: boolean;
  content: string;
  createdAt: string;
}

const EMPTY_FORM = {
  title: "",
  slug: "",
  description: "",
  category: "כללי",
  content: "",
  published: true,
};

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const data = await apiCall<{ success: boolean; articles: Article[] }>(
        API_ENDPOINTS.articles.all,
        { signal }
      );
      setArticles(data.articles);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError("שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditSlug(null);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (article: Article) => {
    setForm({
      title: article.title,
      slug: article.slug,
      description: article.description,
      category: article.category,
      content: article.content,
      published: article.published,
    });
    setEditSlug(article.slug);
    setShowForm(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!form.title || !form.slug || !form.content) {
      setError("כותרת, slug ותוכן הם שדות חובה");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editSlug) {
        await apiCall(API_ENDPOINTS.articles.bySlug(editSlug), {
          method: "PUT",
          body: JSON.stringify(form),
        });
      } else {
        await apiCall(API_ENDPOINTS.articles.list, {
          method: "POST",
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError((err as Error).message || "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("למחוק את המאמר?")) return;
    try {
      await apiCall(API_ENDPOINTS.articles.bySlug(slug), { method: "DELETE" });
      load();
    } catch (err) {
      setError((err as Error).message || "שגיאה במחיקה");
    }
  };

  const autoSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w֐-׿-]/g, "");

  return (
    <div className="admin-articles-page" dir="rtl">
      <div className="admin-articles-header">
        <h1>ניהול מאמרי Docs</h1>
        <button className="admin-articles-new-btn" onClick={openNew}>
          + מאמר חדש
        </button>
      </div>

      {error && <div className="admin-articles-error">{error}</div>}

      {showForm && (
        <div className="admin-articles-form-overlay">
          <div className="admin-articles-form">
            <h2>{editSlug ? "עריכת מאמר" : "מאמר חדש"}</h2>

            <label>כותרת *</label>
            <input
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((f) => ({
                  ...f,
                  title,
                  slug: f.slug || autoSlug(title),
                }));
              }}
              placeholder="כותרת המאמר"
            />

            <label>Slug *</label>
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="my-article-slug"
              dir="ltr"
            />

            <label>תיאור קצר</label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="תיאור קצר שיופיע בכרטיסיה"
            />

            <label>קטגוריה</label>
            <input
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              placeholder="כללי"
            />

            <label>תוכן (Markdown) *</label>
            <textarea
              value={form.content}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: e.target.value }))
              }
              placeholder="# כותרת&#10;&#10;תוכן המאמר בפורמט Markdown..."
              rows={16}
              dir="rtl"
            />

            <label className="admin-articles-checkbox-label">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) =>
                  setForm((f) => ({ ...f, published: e.target.checked }))
                }
              />
              פרסם מאמר
            </label>

            {error && <div className="admin-articles-error">{error}</div>}

            <div className="admin-articles-form-actions">
              <button
                className="admin-articles-save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "שומר..." : "שמור"}
              </button>
              <button
                className="admin-articles-cancel-btn"
                onClick={() => setShowForm(false)}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="admin-articles-loading">טוען...</div>
      ) : (
        <table className="admin-articles-table">
          <thead>
            <tr>
              <th>כותרת</th>
              <th>Slug</th>
              <th>קטגוריה</th>
              <th>מפורסם</th>
              <th>תאריך</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 && (
              <tr>
                <td colSpan={6} className="admin-articles-empty">
                  אין מאמרים עדיין
                </td>
              </tr>
            )}
            {articles.map((a) => (
              <tr key={a._id}>
                <td>{a.title}</td>
                <td dir="ltr">{a.slug}</td>
                <td>{a.category}</td>
                <td>{a.published ? "✅" : "❌"}</td>
                <td>{new Date(a.createdAt).toLocaleDateString("he-IL")}</td>
                <td className="admin-articles-actions">
                  <button onClick={() => openEdit(a)}>ערוך</button>
                  <button
                    className="admin-articles-delete-btn"
                    onClick={() => handleDelete(a.slug)}
                  >
                    מחק
                  </button>
                  <a
                    href={`/docs/${a.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-articles-view-link"
                  >
                    צפה
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}