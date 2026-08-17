import { useEffect, useMemo, useState } from "react";
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

function canReview(user) {
  return user.role === "coordinator" || user.role === "teacher";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SubmissionsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [openAssignments, setOpenAssignments] = useState([]);
  const [error, setError] = useState("");
  const [contentDrafts, setContentDrafts] = useState({});
  const [fileDrafts, setFileDrafts] = useState({});
  const [studentFilter, setStudentFilter] = useState("");

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
      const file = fileDrafts[lessonLogId];
      const payload = { lessonLogId, content: contentDrafts[lessonLogId] || "" };
      if (file) {
        payload.fileName = file.name;
        payload.fileType = file.type;
        payload.fileData = await fileToBase64(file);
      }
      await api.post("/api/submissions", payload);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "שגיאה בהגשה");
    }
  }

  async function updateStatus(submissionId, status) {
    await api.put(`/api/submissions/${submissionId}/status`, { status });
    load();
  }

  async function downloadFile(submission) {
    const res = await api.get(`/api/submissions/${submission._id}/file`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = submission.fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  const visibleSubmissions = useMemo(() => {
    if (user.role !== "coordinator" || !studentFilter.trim()) return submissions;
    const needle = studentFilter.trim().toLowerCase();
    return submissions.filter((s) => s.studentName.toLowerCase().includes(needle));
  }, [submissions, studentFilter, user.role]);

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
            {openAssignments.map(({ lessonLog }) => (
              <li className="open-assignment-item" key={lessonLog._id}>
                <div>
                  <strong>{lessonLog.assignmentTitle || TYPE_LABELS[lessonLog.assignmentType]}</strong>
                  <span className="muted"> · {TYPE_LABELS[lessonLog.assignmentType]}</span>
                </div>
                <div className="submit-row">
                  <input
                    placeholder="תוכן ההגשה"
                    value={contentDrafts[lessonLog._id] || ""}
                    onChange={(e) => setContentDrafts({ ...contentDrafts, [lessonLog._id]: e.target.value })}
                  />
                  <input
                    type="file"
                    onChange={(e) => setFileDrafts({ ...fileDrafts, [lessonLog._id]: e.target.files[0] || null })}
                  />
                  <button onClick={() => submitAssignment(lessonLog._id)}>הגש</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {user.role === "coordinator" && (
        <div className="inline-form">
          <input
            placeholder="סינון לפי שם תלמידה"
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
          />
        </div>
      )}

      <table className="submissions-table">
        <thead>
          <tr>
            <th>תלמידה</th>
            <th>סוג הגשה</th>
            <th>יחידה מקושרת</th>
            <th>קובץ</th>
            <th>סטטוס</th>
            {user.role !== "student" && <th>פעולה</th>}
          </tr>
        </thead>
        <tbody>
          {visibleSubmissions.map((s) => (
            <tr key={s._id}>
              <td>{s.studentName}</td>
              <td>{TYPE_LABELS[s.type]}</td>
              <td className="pill">🔗 {s.courseName} · {s.unitTitle}</td>
              <td>
                {s.fileName ? (
                  <button className="link-button" onClick={() => downloadFile(s)}>
                    📎 {s.fileName}
                  </button>
                ) : (
                  <span className="muted">-</span>
                )}
              </td>
              <td>
                <span className={"status-tag status-" + s.status}>{STATUS_LABELS[s.status]}</span>
              </td>
              {user.role !== "student" && (
                <td>
                  {canReview(user) && (
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
