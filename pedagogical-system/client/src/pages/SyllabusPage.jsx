import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import LinkStrip from "../components/LinkStrip";

function canEditCourse(user, course) {
  if (user.role === "coordinator") return true;
  if (user.role === "teacher") return (user.teachesCourseIds || []).includes(course._id);
  return false;
}

export default function SyllabusPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [error, setError] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [unitDrafts, setUnitDrafts] = useState({}); // courseId -> { title, hours }

  async function load() {
    try {
      const res = await api.get("/api/courses");
      setCourses(res.data.courses);
    } catch (err) {
      setError(err.response?.data?.error || "שגיאה בטעינת סילבוסים");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(courseId) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(courseId) ? next.delete(courseId) : next.add(courseId);
      return next;
    });
  }

  async function addCourse(e) {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    await api.post("/api/courses", { name: newCourseName.trim() });
    setNewCourseName("");
    load();
  }

  async function addUnit(courseId) {
    const draft = unitDrafts[courseId];
    if (!draft?.title || !draft?.hours) return;
    await api.post(`/api/courses/${courseId}/units`, { title: draft.title, hours: Number(draft.hours) });
    setUnitDrafts((prev) => ({ ...prev, [courseId]: { title: "", hours: "" } }));
    load();
  }

  async function deleteUnit(courseId, unitId) {
    await api.delete(`/api/courses/${courseId}/units/${unitId}`);
    load();
  }

  return (
    <div className="page">
      <LinkStrip />
      <h1>סילבוסים</h1>
      {error && <div className="form-error">{error}</div>}

      {user.role === "coordinator" && (
        <form className="inline-form" onSubmit={addCourse}>
          <input
            placeholder="שם קורס חדש"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
          />
          <button type="submit">הוספת קורס</button>
        </form>
      )}

      <div className="course-list">
        {courses.map((course) => {
          const editable = canEditCourse(user, course);
          const isOpen = expanded.has(course._id);
          const draft = unitDrafts[course._id] || { title: "", hours: "" };

          return (
            <div className="course-card" key={course._id}>
              <button className="course-header" onClick={() => toggle(course._id)}>
                <span>{isOpen ? "▼" : "◀"}</span>
                <span className="course-name">{course.name}</span>
                <span className="course-hours">
                  {course.units.reduce((sum, u) => sum + u.hours, 0)} שעות סה"כ
                </span>
              </button>

              {isOpen && (
                <div className="course-body">
                  <ul className="unit-list">
                    {course.units.map((unit) => (
                      <li key={unit._id} className="unit-item">
                        <span>{unit.title}</span>
                        <span className="unit-hours">{unit.hours} שעות</span>
                        {editable && (
                          <button className="link-button danger" onClick={() => deleteUnit(course._id, unit._id)}>
                            מחיקה
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  {editable && (
                    <div className="inline-form">
                      <input
                        placeholder="שם יחידה"
                        value={draft.title}
                        onChange={(e) =>
                          setUnitDrafts((prev) => ({ ...prev, [course._id]: { ...draft, title: e.target.value } }))
                        }
                      />
                      <input
                        placeholder="שעות"
                        type="number"
                        value={draft.hours}
                        onChange={(e) =>
                          setUnitDrafts((prev) => ({ ...prev, [course._id]: { ...draft, hours: e.target.value } }))
                        }
                      />
                      <button onClick={() => addUnit(course._id)}>הוספת יחידה</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
