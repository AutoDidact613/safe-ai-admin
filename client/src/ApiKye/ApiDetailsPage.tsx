import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from '../app/store';; // נניח שיש לך הגדרת RootState ב-store שלך
import "./ApiStyles.css";

interface UseDetail {
  day: string;
  tokensUsed: number;
}

interface ApiItem {
  id: number;
  name: string;
  key: string;
  apiAddress?: string;
  userId: number;
  useDitails: UseDetail[];
}

export const ApiDetailsPage: React.FC = () => {
  const { apiId } = useParams<{ apiId: string }>();
  const navigate = useNavigate();

  const api = useSelector((state: RootState) =>
    state.api.api.find((p: ApiItem) => p.id === Number(apiId))
  );

  if (!api) {
    return (
      <div className="page-container" style={{ textAlign: "center" }}>
        <h2>API לא נמצאה</h2>
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← חזור
        </button>
      </div>
    );
  }

  const maxTokens = Math.max(...api.useDitails.map((day) => day.tokensUsed), 1);

  return (
    <div className="page-container">
      <button
        className="back-btn"
        onClick={() => navigate(-1)}
        style={{ marginBottom: "20px" }}
      >
        ← חזור
      </button>

      <h1>פרטי שימוש - {api.name}</h1>
      <p>
        <strong>Key:</strong> {api.key}
      </p>

      <div style={{ marginTop: "30px" }}>
        <h2>שימוש השבועי</h2>

        {api.useDitails && api.useDitails.length > 0 ? (
          <>
            {/* גרף עמודות */}
            <div className="chart-container">
              {api.useDitails.map((day, index) => {
                const percentage = (day.tokensUsed / maxTokens) * 100;
                const barHeight = Math.max(percentage, 5); // לפחות 5px לכל עמודה
                return (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: "10px",
                      flex: 1,
                      height: "100%",
                    }}
                  >
                    {/* עמודה */}
                    <div
                      style={{
                        width: "100%",
                        backgroundColor: "#10a37f",
                        height: `${barHeight}%`,
                        borderRadius: "4px",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#0d9970")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#10a37f")
                      }
                      title={`${day.day}: ${day.tokensUsed} tokens`}
                    ></div>

                    {/* מספר */}
                    <div style={{ fontSize: "12px", fontWeight: "bold" }}>
                      {day.tokensUsed}
                    </div>

                    {/* יום */}
                    <div style={{ fontSize: "14px", textAlign: "center" }}>
                      {day.day}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* טבלה עם פרטים */}
            <div style={{ marginTop: "30px" }}>
              <h3>טבלת פרטים</h3>
              <table>
                <thead>
                  <tr style={{ backgroundColor: "#f0f0f0" }}>
                    <th style={{ border: "1px solid #ccc", padding: "10px" }}>
                      יום
                    </th>
                    <th style={{ border: "1px solid #ccc", padding: "10px" }}>
                      טוקנים ששומשו
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {api.useDitails.map((day, index) => (
                    <tr key={index}>
                      <td style={{ border: "1px solid #ccc", padding: "10px" }}>
                        {day.day}
                      </td>
                      <td style={{ border: "1px solid #ccc", padding: "10px" }}>
                        {day.tokensUsed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div
            style={{
              padding: "20px",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            אין נתוני שימוש זמינים
          </div>
        )}

        {/* סיכום */}
        <div className="summary-card">
          <h3>סיכום שבועי</h3>
          <p>
            <strong>סה"כ שימוש:</strong>{" "}
            {api.useDitails && api.useDitails.length > 0
              ? api.useDitails.reduce((sum, day) => sum + day.tokensUsed, 0)
              : 0}{" "}
            tokens
          </p>
          <p>
            <strong>ממוצע ליום:</strong>{" "}
            {api.useDitails && api.useDitails.length > 0
              ? (
                  api.useDitails.reduce((sum, day) => sum + day.tokensUsed, 0) /
                  7
                ).toFixed(2)
              : 0}{" "}
            tokens
          </p>
          <p>
            <strong>יום עם השימוש המרבי:</strong>{" "}
            {api.useDitails && api.useDitails.length > 0
              ? api.useDitails.reduce((max, day) =>
                  day.tokensUsed > max.tokensUsed ? day : max
                ).day
              : "אין נתונים"}{" "}
            {api.useDitails && api.useDitails.length > 0 && (
              <>
                (
                {api.useDitails.reduce((max, day) =>
                  day.tokensUsed > max.tokensUsed ? day : max
                ).tokensUsed}{" "}
                tokens)
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
