import { useEffect, useState, type FormEvent } from "react";
import { API_ENDPOINTS, apiCall } from "../config/api";

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
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f8fafc",
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              margin: "0 auto 1rem",
              border: "8px solid rgba(15, 23, 42, 0.15)",
              borderTopColor: "#2563eb",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <div style={{ color: "#334155", fontSize: "1rem" }}>טוען חדשות...</div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem 1rem", maxWidth: 980, margin: "0 auto", background: "#f8fafc" }}>
      <div
        style={{
          background: "#ffffff",
          borderRadius: 28,
          boxShadow: "0 28px 90px rgba(15, 23, 42, 0.12)",
          padding: "2rem",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.75rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: "2rem", color: "#111827" }}>AI News</h1>
            <p style={{ margin: "0.75rem 0 0", color: "#64748b", fontSize: "0.95rem" }}>
              חדשות AI הכי חמות שיש!!!
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={handleStartCreate}
              style={{
                background: "#14b8a6",
                color: "#ffffff",
              border: "none",
              borderRadius: 16,
              padding: "0.95rem 1.5rem",
              fontWeight: 700,
              boxShadow: "0 16px 40px rgba(20, 184, 166, 0.2)",
              cursor: "pointer",
            }}
          >
            הוספת חדשות
          </button>)}
        </div>

        {!showForm && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginBottom: "1.5rem",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חיפוש לפי כותרת"
              style={{
                flex: 1,
                minWidth: 240,
                padding: "0.95rem 1rem",
                borderRadius: 16,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#111827",
              }}
            />
            <div style={{ color: "#64748b", fontSize: "0.95rem" }}>
              {filteredNews.length} תוצאות
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: "1.5rem",
              color: "#b91c1c",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 16,
              padding: "1rem 1.25rem",
            }}
          >
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 24,
              padding: "1.75rem",
              marginBottom: "2rem",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "1rem", color: "#111827" }}>
              {editingId ? "עריכת חדשות" : "יצירת חדשות"}
            </h3>

            <div style={{ display: "grid", gap: "1rem" }}>
              <input
                type="text"
                placeholder="כותרת"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{
                  padding: "1rem 1rem",
                  width: "100%",
                  borderRadius: 16,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#111827",
                  boxSizing: "border-box",
                }}
              />

              <textarea
                placeholder="תוכן"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
                style={{
                  padding: "1rem 1rem",
                  width: "100%",
                  borderRadius: 16,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#111827",
                  resize: "vertical",
                  minHeight: 160,
                  boxSizing: "border-box",
                }}
              />

              <input
                type="text"
                placeholder="מקור (אופציונלי)"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                style={{
                  padding: "1rem 1rem",
                  width: "100%",
                  borderRadius: 16,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#111827",
                  boxSizing: "border-box",
                }}
              />

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 16,
                    padding: "0.95rem 1.4rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "שומר..." : editingId ? "עדכון" : "שמירה"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    background: "#ffffff",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                    borderRadius: 16,
                    padding: "0.95rem 1.4rem",
                    cursor: "pointer",
                  }}
                >
                  איפוס
                </button>
              </div>
            </div>
          </form>
        )}

        {!showForm && (
          filteredNews.length === 0 ? (
            <p style={{ margin: 0, color: "#475569" }}>
              {news.length === 0 ? "אין חדשות כרגע." : "אין חדשות מתאימות."}
            </p>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {filteredNews.map((item) => (
                <article
                  key={item._id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 24,
                    padding: "1.6rem",
                    boxShadow: "0 18px 48px rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, color: "#111827" }}>{item.title}</h3>
                      <small style={{ color: "#64748b" }}>
                        {item.source ? `מקור: ${item.source}` : "מקור: User"}
                      </small>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        style={{
                          background: "#f8fafc",
                          color: "#0f172a",
                          border: "1px solid #cbd5e1",
                          borderRadius: 16,
                          padding: "0.75rem 1rem",
                          cursor: "pointer",
                        }}
                      >
                        ערוך
                      </button>)}
                        {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openDeleteModal(item)}
                        style={{
                          background: "#ef4444",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 16,
                          padding: "0.75rem 1rem",
                          cursor: "pointer",
                        }}
                      >
                        מחק
                      </button>)}
                    </div>
                  </div>
                  <p style={{ margin: "1rem 0 0", color: "#475569", lineHeight: 1.75 }}>
                    {item.content}
                  </p>
                </article>
              ))}
            </div>
          )
        )}
      </div>

      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "1rem",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 24,
              padding: "2rem",
              width: "100%",
              maxWidth: 440,
              boxShadow: "0 24px 80px rgba(15, 23, 42, 0.16)",
            }}
          >
            <h2 style={{ margin: 0, color: "#111827", fontSize: "1.3rem" }}>אישור מחיקה</h2>
            <p style={{ margin: "1rem 0 1.5rem", color: "#475569" }}>
              האם אתה בטוח שברצונך למחוק את הפריט "{deleteTarget.title}"?
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={cancelDelete}
                style={{
                  background: "#f8fafc",
                  color: "#0f172a",
                  border: "1px solid #cbd5e1",
                  borderRadius: 16,
                  padding: "0.95rem 1.2rem",
                  cursor: "pointer",
                }}
              >
                לא
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={submitting}
                style={{
                  background: "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 16,
                  padding: "0.95rem 1.2rem",
                  cursor: "pointer",
                  opacity: submitting ? 0.7 : 1,
                }}
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
