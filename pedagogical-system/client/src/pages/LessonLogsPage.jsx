import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import LinkStrip from "../components/LinkStrip";

const ASSIGNMENT_TYPE_LABELS = {
  exercise: "תרגיל",
  quiz_solution: "פתרון בוחן",
  project: "פרויקט",
};

function canEditLog(user, log) {
  if (user.role === "coordinator") return true;
  if (user.role === "teacher") return log.teacherId === user._id;
  return false;
}

function canCreateForCourse(user, courseId) {
  if (user.role === "coordinator") return true;
  if (user.role === "teacher") return (user.teachesCourseIds || []).includes(courseId);
  return false;
}

export default function LessonLogsPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    courseId: "",
    unitId: "",
    date: "",
    note: "",
    hasAssignment: false,
    assignmentType: "exercise",
    assignmentTitle: "",
  });

  async function load() {
    try {
      const [coursesRes, logsRes] = await Promise.all([api.get("/api/courses"), api.get("/api/lesson-logs")]);
      setCourses(coursesRes.data.courses);
      setLogs(logsRes.data.lessonLogs);
    } catch (err) {
      setError(err.response?.data?.error || "שגיאה בטעינת תיעוד שיעורים");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const courseById = Object.fromEntries(courses.map((c) => [c._id, c]));
  const creatableCourses = courses.filter((c) => canCreateForCourse(user, c._id));

  function unitTitle(courseId, unitId) {
    const unit = courseById[courseId]?.units.find((u) => u._id === unitId);
    return unit ? unit.title : "יחידה לא ידועה";
  }

  async function submitLog(e) {
    e.preventDefault();
    if (!form.courseId || !form.unitId || !form.date) return;
    try {
      await api.post("/api/lesson-logs", form);
      setForm({ ...form, note: "", hasAssignment: false, assignmentTitle: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "שגיאה בשמירת תיעוד");
    }
  }

  async function toggleAssignment(log) {
    await api.put(`/api/lesson-logs/${log._id}`, {
      hasAssignment: !log.hasAssignment,
      assignmentType: log.assignmentType || "exercise",
    });
    load();
  }

  return (
    <div className="page">
      <LinkStrip />
      <h1>תיעוד שיעורים</h1>
      {error && <div className="form-error">{error}</div>}

      {creatableCourses.length > 0 && (
        <form className="lesson-log-form" onSubmit={submitLog}>
          <select
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value, unitId: "" })}
          >
            <option value="">בחירת קורס</option>
            {creatableCourses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <select value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
            <option value="">בחירת יחידה</option>
            {(courseById[form.courseId]?.units || []).map((u) => (
              <option key={u._id} value={u._id}>
                {u.title}
              </option>
            ))}
          </select>

          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input
            placeholder="הערה חופשית"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.hasAssignment}
              onChange={(e) => setForm({ ...form, hasAssignment: e.target.checked })}
            />
            ניתנה מטלה בשיעור זה
          </label>

          {form.hasAssignment && (
            <>
              <select
                value={form.assignmentType}
                onChange={(e) => setForm({ ...form, assignmentType: e.target.value })}
              >
                {Object.entries(ASSIGNMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                placeholder="כותרת המטלה"
                value={form.assignmentTitle}
                onChange={(e) => setForm({ ...form, assignmentTitle: e.target.value })}
              />
            </>
          )}

          <button type="submit">שמירת תיעוד</button>
        </form>
      )}

      <ul className="lesson-log-list">
        {logs.map((log) => (
          <li className="lesson-log-item" key={log._id}>
            <div className="lesson-log-meta">
              <span>{new Date(log.date).toLocaleDateString("he-IL")}</span>
              <span>{log.teacherName}</span>
              <span className="pill">
                🔗 {courseById[log.courseId]?.name} · {unitTitle(log.courseId, log.unitId)}
              </span>
            </div>
            {log.note && <p className="lesson-log-note">{log.note}</p>}

            {log.hasAssignment ? (
              <span className="assignment-tag">
                ניתנה מטלה: {ASSIGNMENT_TYPE_LABELS[log.assignmentType]}
                {log.assignmentTitle ? ` - ${log.assignmentTitle}` : ""}
              </span>
            ) : (
              <span className="assignment-tag muted">לא ניתנה מטלה</span>
            )}

            {canEditLog(user, log) && (
              <button className="link-button" onClick={() => toggleAssignment(log)}>
                {log.hasAssignment ? "ביטול מטלה" : "סימון שניתנה מטלה"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
