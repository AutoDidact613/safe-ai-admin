import { useEffect, useState, type FormEvent } from "react";
import { API_ENDPOINTS, apiCall } from "../config/api";
import "../styles/news-page.css";

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  source?: string;
  createdAt?: string;
}

interface NewsFormState {
  title: string;
  content: string;
  source: string;
}

const initialFormState: NewsFormState = {
  title: "",
  content: "",
  source: "",
};

export default function AiNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<NewsFormState>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null);

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    void loadNews();
  }, []);

  const loadNews = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCall<NewsItem[]>(API_ENDPOINTS.news);
      setNews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת החדשות");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setShowForm(false);
  };

  const handleStartCreate = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setShowForm(true);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      setError("יש למלא כותרת ותוכן");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (editingId) {
        await apiCall(`${API_ENDPOINTS.news}/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({
            title: formData.title.trim(),
            content: formData.content.trim(),
            source: formData.source.trim() || "User",
          }),
        });
      } else {
        await apiCall(API_ENDPOINTS.news, {
          method: "POST",
          body: JSON.stringify({
            title: formData.title.trim(),
            content: formData.content.trim(),
            source: formData.source.trim() || "User",
          }),
        });
      }

      await loadNews();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירת החדשות");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: NewsItem) => {
    setEditingId(item._id);
    setFormData({
      title: item.title,
      content: item.content,
      source: item.source || "",
    });
    setShowForm(true);
    setError(null);
  };

  const openDeleteModal = (item: NewsItem) => {
    setDeleteTarget(item);
    setError(null);
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setSubmitting(true);
      setError(null);
      await apiCall(`${API_ENDPOINTS.news}/${deleteTarget._id}`, {
        method: "DELETE",
      });
      await loadNews();
      if (editingId === deleteTarget._id) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה במחיקת החדשות");
    } finally {
      setSubmitting(false);
      setDeleteTarget(null);
    }
  };

  const filteredNews = news.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase().trim()),
  );

  if (loading) {
    return (
      <div className="news-loading-container">
        <div className="news-loading-content">
          <div className="news-spinner" />
          <div className="news-loading-text">טוען חדשות...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="news-page-container">
      <div className="news-card-wrapper">
        <div className="news-header-section">
          <div className="news-header-content">
            <h1 className="news-header-title">AI News</h1>
            <p className="news-header-subtitle">
              חדשות AI הכי חמות שיש!!!
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={handleStartCreate}
              className="btn-add-news"
            >
              הוספת חדשות
            </button>)}
        </div>

        {!showForm && (
          <div className="news-search-section">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חיפוש לפי כותרת"
              className="news-search-input"
            />
            <div className="news-results-count">
              {filteredNews.length} תוצאות
            </div>
          </div>
        )}

        {error && (
          <div className="news-error-message">
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="news-form-container"
          >
            <h3 className="news-form-title">
              {editingId ? "עריכת חדשות" : "יצירת חדשות"}
            </h3>

            <div className="news-form-inputs">
              <input
                type="text"
                placeholder="כותרת"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="news-input-field"
              />

              <textarea
                placeholder="תוכן"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
                className="news-textarea"
              />

              <input
                type="text"
                placeholder="מקור (אופציונלי)"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="news-input-field"
              />

              <div className="news-form-buttons">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-submit"
                >
                  {submitting ? "שומר..." : editingId ? "עדכון" : "שמירה"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-reset"
                >
                  איפוס
                </button>
              </div>
            </div>
          </form>
        )}

        {!showForm && (
          filteredNews.length === 0 ? (
            <p className="news-empty-message">
              {news.length === 0 ? "אין חדשות כרגע." : "אין חדשות מתאימות."}
            </p>
          ) : (
            <div className="news-grid">
              {filteredNews.map((item) => (
                <article
                  key={item._id}
                  className="news-article-card"
                >
                  <div className="news-article-header">
                    <div>
                      <h3 className="news-article-title">{item.title}</h3>
                      <small className="news-article-source">
                        {item.source ? `מקור: ${item.source}` : "מקור: User"}
                      </small>
                    </div>
                    <div className="news-article-actions">
                        {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="btn-edit"
                      >
                        ערוך
                      </button>)}
                        {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openDeleteModal(item)}
                        className="btn-delete"
                      >
                        מחק
                      </button>)}
                    </div>
                  </div>
                  <p className="news-article-content">
                    {item.content}
                  </p>
                </article>
              ))}
            </div>
          )
        )}
      </div>

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">אישור מחיקה</h2>
            <p className="modal-message">
              האם אתה בטוח שברצונך למחוק את הפריט "{deleteTarget.title}"?
            </p>
            <div className="modal-buttons">
              <button
                type="button"
                onClick={cancelDelete}
                className="btn-cancel"
              >
                לא
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={submitting}
                className="btn-confirm-delete"
              >
                כן
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
