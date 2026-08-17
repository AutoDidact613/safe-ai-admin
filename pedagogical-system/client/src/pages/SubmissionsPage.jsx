import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import LinkStrip from "../components/LinkStrip";

const TYPE_LABELS = { exercise: "תרגיל", quiz_solution: "פתרון בוחן", project: "פרויקט" };
const STATUS_LABELS = {
  not_submitted: "טרם הוגש",
  submitted: "הוגש",
  in_review: "בבדיקה",
  reviewed: "נבדק",
};

function canReview(user, submission) {
  return user.role === "coordinator" || user.role === "teacher";
}

export default function SubmissionsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [openAssignments, setOpenAssignments] = useState([]);
  const [error, setError] = useState("");
  const [contentDrafts, setContentDrafts] = useState({});

  async function load() {
    try {
      const requests = [api.get("/api/submissions")];
      if (user.role === "student") requests.push(api.get("/api/submissions/open-assignments"));
      const [subsRes, openRes] = await Promise.all(requests);
      setSubmissions(subsRes.data.submissions);
      if (openRes) setOpenAssignments(openRes.data.openAssignments);
    } catch (err) {
      setError(err.response?.data?.error || "שגיאה בטעינת הגשות");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submitAssignment(lessonLogId) {
    try {
      await api.post("/api/submissions", { lessonLogId, content: contentDrafts[lessonLogId] || "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "שגיאה בהגשה");
    }
  }

  async function updateStatus(submissionId, status) {
    await api.put(`/api/submissions/${submissionId}/status`, { status });
    load();
  }

  return (
    <div className="page">
      <LinkStrip />
      <h1>הגשות</h1>
      {error && <div className="form-error">{error}</div>}

      {user.role === "student" && (
        <section className="open-assignments">
          <h2>מטלות פתוחות להגשה</h2>
          {openAssignments.length === 0 && <p className="muted">אין כרגע מטלות פתוחות.</p>}
          <ul>
            {openAssignments.map(({ lessonLog, submission }) => (
              <li className="open-assignment-item" key={lessonLog._id}>
                <div>
                  <strong>{lessonLog.assignmentTitle || TYPE_LABELS[lessonLog.assignmentType]}</strong>
                  <span className="muted"> · {TYPE_LABELS[lessonLog.assignmentType]}</span>
                </div>
                {submission ? (
                  <span className={"status-tag status-" + submission.status}>{STATUS_LABELS[submission.status]}</span>
                ) : (
                  <div className="submit-row">
                    <input
                      placeholder="תוכן ההגשה"
                      value={contentDrafts[lessonLog._id] || ""}
                      onChange={(e) => setContentDrafts({ ...contentDrafts, [lessonLog._id]: e.target.value })}
                    />
                    <button onClick={() => submitAssignment(lessonLog._id)}>הגש</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <table className="submissions-table">
        <thead>
          <tr>
            <th>תלמידה</th>
            <th>סוג הגשה</th>
            <th>יחידה מקושרת</th>
            <th>סטטוס</th>
            {user.role !== "student" && <th>פעולה</th>}
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s._id}>
              <td>{s.studentName}</td>
              <td>{TYPE_LABELS[s.type]}</td>
              <td className="pill">🔗 {s.courseName} · {s.unitTitle}</td>
              <td>
                <span className={"status-tag status-" + s.status}>{STATUS_LABELS[s.status]}</span>
              </td>
              {user.role !== "student" && (
                <td>
                  {canReview(user, s) && (
                    <select value={s.status} onChange={(e) => updateStatus(s._id, e.target.value)}>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
