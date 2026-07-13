import { useState, useMemo, useEffect } from "react";
import "../styles/recommended-guides-page.css";

interface Guide {
  id: string;
  title: string;
  description: string;
  link: string;
  duration: string;
  language: string;
  technologies: string;
  rating: string;
  creator?: string;
  feedback?: string;
  sheet: string;
}

type ViewMode = "cards" | "table";

interface SheetInfo {
  name: string;
  gid: string;
}

const SHEETS: SheetInfo[] = [
  { name: "AI Engineering (פיתוח סוכנים-Workflows)", gid: "593094152" },
  { name: "Data Science (AI & ML)", gid: "0" },
  {
    name: "שימוש בכלי AI לפיתוח לעבודה יומיומית (Claude Code, Copilot)",
    gid: "2",
  },
  { name: "ויב קודינג (Vibe Coding / בניית אתרים בקלטקס)", gid: "3" },
];

export default function RecommendedGuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [sheetFilter, setSheetFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Load guides from all Google Sheets
  useEffect(() => {
    const loadGuides = async () => {
      try {
        setLoading(true);
        const sheetId = "1I8y1bH400KnpkcD1q-gGYjy-uM__i3Xs-MFqc9uJakY";
        const allGuides: Guide[] = [];

        // Load from all sheets
        for (const sheet of SHEETS) {
          try {
            const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheet.gid}`;
            const response = await fetch(url);
            const text = await response.text();

            // Parse CSV
            const lines = text.split("\n");

            // Skip header row
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              // Simple CSV parsing (handles basic cases)
              const values = line.split(",");
              if (values.length >= 6) {
                allGuides.push({
                  id: `${sheet.gid}-${i}`,
                  link: values[0]?.trim() || "",
                  description: values[1]?.trim() || "",
                  duration: values[3]?.trim() || "לא צוין",
                  language: values[4]?.trim() || "לא צוין",
                  technologies: values[5]?.trim() || "לא צוין",
                  creator: values[7]?.trim() || "",
                  feedback: values[8]?.trim() || "",
                  rating: values[9]?.trim() || "⭐⭐⭐",
                  title: values[1]?.substring(0, 60) || "מדריך",
                  sheet: sheet.name,
                });
              }
            }
          } catch (sheetError) {
            console.error(`Error loading sheet ${sheet.name}:`, sheetError);
          }
        }

        setGuides(allGuides);
        setError(null);
      } catch (err) {
        console.error("Error loading guides:", err);
        setError("שגיאה בטעינת המדריכים. אנא נסה שוב מאוחר יותר.");
      } finally {
        setLoading(false);
      }
    };

    loadGuides();
  }, []);

  // Filter and search guides
  const filteredGuides = useMemo(() => {
    let result = guides;

    // Sheet filter
    if (sheetFilter !== "all") {
      result = result.filter((guide) => guide.sheet === sheetFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (guide) =>
          guide.title.toLowerCase().includes(query) ||
          guide.description.toLowerCase().includes(query) ||
          guide.technologies.toLowerCase().includes(query) ||
          guide.language.toLowerCase().includes(query) ||
          guide.sheet.toLowerCase().includes(query),
      );
    }

    // Language filter
    if (languageFilter !== "all") {
      result = result.filter((guide) =>
        guide.language.toLowerCase().includes(languageFilter.toLowerCase()),
      );
    }

    // Rating filter
    if (ratingFilter !== "all") {
      const minStars = parseInt(ratingFilter);
      result = result.filter((guide) => {
        const stars = (guide.rating.match(/⭐/g) || []).length;
        return stars >= minStars;
      });
    }

    return result;
  }, [guides, searchQuery, languageFilter, ratingFilter, sheetFilter]);

  // Statistics
  const stats = useMemo(() => {
    const hebrewCount = guides.filter((g) =>
      g.language.toLowerCase().includes("עברית"),
    ).length;
    const englishCount = guides.filter((g) =>
      g.language.toLowerCase().includes("אנגלית"),
    ).length;
    const highRated = guides.filter(
      (g) => (g.rating.match(/⭐/g) || []).length >= 4,
    ).length;

    return {
      total: guides.length,
      hebrew: hebrewCount,
      english: englishCount,
      highRated,
    };
  }, [guides]);

  if (loading) {
    return (
      <div className="recommended-guides-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>טוען מדריכים מהאקסל...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recommended-guides-page">
        <div className="error-container">
          <span className="error-icon">⚠️</span>
          <h2>שגיאה בטעינת המדריכים</h2>
          <p>{error}</p>
          <a
            href="https://docs.google.com/spreadsheets/d/1I8y1bH400KnpkcD1q-gGYjy-uM__i3Xs-MFqc9uJakY/edit?gid=593094152#gid=593094152"
            target="_blank"
            rel="noopener noreferrer"
            className="excel-link-button"
          >
            📊 פתח את קובץ האקסל ישירות
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="recommended-guides-page">
      <div className="recommended-guides-container">
        {/* Header */}
        <div className="page-header">
          <h1>🎓 כל המדריכים המומלצים</h1>
          <p className="page-subtitle">
            מדריכים איכותיים שנבחרו בקפידה לפיתוח, הטמעה ולמידה של AI למפתחים
          </p>
          <div className="curator-info">

            <div className="curator-details">
              <strong>נערך על ידי: מרים ק.</strong>
              <p className="curator-tagline">
                צרו קשר לפיתוח, הטמעה והנחיית AI בארגון שלכם
              </p>

              <a href="mailto:m0534147159@gmail.com" className="curator-email">
                m0534147159@gmail.com |                 053-414-7159

              </a>
       
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="statistics-bar">
          <div className="stat-item">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">סך הכל מדריכים</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.hebrew}</span>
            <span className="stat-label">מדריכים בעברית</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.english}</span>
            <span className="stat-label">מדריכים באנגלית</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.highRated}</span>
            <span className="stat-label">דירוג גבוה (4+ כוכבים)</span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="controls-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="🔍 חיפוש לפי כותרת, תיאור, טכנולוגיה או שפה..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filters-row">
            <div className="filter-group">
              <label>קטגוריה:</label>
              <select
                value={sheetFilter}
                onChange={(e) => setSheetFilter(e.target.value)}
                className="filter-select sheet-filter"
              >
                <option value="all">כל הקטגוריות</option>
                {SHEETS.map((sheet) => (
                  <option key={sheet.gid} value={sheet.name}>
                    {sheet.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>שפה:</label>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">הכל</option>
                <option value="עברית">עברית</option>
                <option value="אנגלית">אנגלית</option>
              </select>
            </div>

            <div className="filter-group">
              <label>דירוג מינימלי:</label>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">הכל</option>
                <option value="5">⭐⭐⭐⭐⭐ (5 כוכבים)</option>
                <option value="4">⭐⭐⭐⭐ (4+ כוכבים)</option>
                <option value="3">⭐⭐⭐ (3+ כוכבים)</option>
              </select>
            </div>

            <div className="view-toggle">
              <button
                className={`view-button ${viewMode === "cards" ? "active" : ""}`}
                onClick={() => setViewMode("cards")}
                title="תצוגת כרטיסים"
              >
                🎴 כרטיסים
              </button>
              <button
                className={`view-button ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="תצוגת טבלה"
              >
                📋 טבלה
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="results-info">
          <p>
            מציג <strong>{filteredGuides.length}</strong> מדריכים
            {filteredGuides.length !== stats.total && ` מתוך ${stats.total}`}
          </p>
        </div>

        {/* Guides Display */}
        {filteredGuides.length > 0 ? (
          viewMode === "cards" ? (
            <div className="guides-grid">
              {filteredGuides.map((guide) => (
                <a
                  key={guide.id}
                  href={guide.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="guide-card"
                >
                  <div className="guide-card-header">
                    <span className="guide-rating">{guide.rating}</span>
                    <span className="guide-language">{guide.language}</span>
                  </div>
                  <h3 className="guide-title">{guide.title}</h3>
                  <p className="guide-description">{guide.description}</p>
                  <div className="guide-meta">
                    <span className="guide-duration">⏱️ {guide.duration}</span>
                    <span className="guide-technologies">
                      🔧 {guide.technologies}
                    </span>
                  </div>
                  {guide.feedback && (
                    <div className="guide-feedback">💬 {guide.feedback}</div>
                  )}
                  <div className="guide-card-footer">
                    <span className="guide-link-text">למד עכשיו →</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="guides-table-container">
              <table className="guides-table">
                <thead>
                  <tr>
                    <th>דירוג</th>
                    <th>כותרת</th>
                    <th>שפה</th>
                    <th>משך</th>
                    <th>טכנולוגיות</th>
                    <th>פעולה</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuides.map((guide) => (
                    <tr key={guide.id}>
                      <td className="rating-cell">{guide.rating}</td>
                      <td className="title-cell">
                        <strong>{guide.title}</strong>
                        <p className="table-description">{guide.description}</p>
                      </td>
                      <td className="language-cell">{guide.language}</td>
                      <td className="duration-cell">{guide.duration}</td>
                      <td className="tech-cell">{guide.technologies}</td>
                      <td className="action-cell">
                        <a
                          href={guide.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="table-link-button"
                        >
                          צפה →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="no-results">
            <span className="no-results-icon">🔍</span>
            <p>לא נמצאו מדריכים התואמים את החיפוש</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setLanguageFilter("all");
                setRatingFilter("all");
              }}
              className="clear-filters-button"
            >
              נקה את כל הפילטרים
            </button>
          </div>
        )}

        {/* Excel Link */}
        <div className="excel-link-section">
          <a
            href="https://docs.google.com/spreadsheets/d/1I8y1bH400KnpkcD1q-gGYjy-uM__i3Xs-MFqc9uJakY/edit?gid=593094152#gid=593094152"
            target="_blank"
            rel="noopener noreferrer"
            className="excel-link-button"
          >
            📊 פתח את קובץ האקסל המלא
          </a>
        </div>
      </div>
    </div>
  );
}
