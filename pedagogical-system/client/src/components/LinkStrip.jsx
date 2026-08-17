import { useLocation, Link } from "react-router-dom";

const STEPS = [
  { path: "/syllabus", label: "סילבוס" },
  { path: "/lesson-logs", label: "תיעוד" },
  { path: "/submissions", label: "הגשה" },
];

export default function LinkStrip() {
  const location = useLocation();

  return (
    <div className="link-strip">
      {STEPS.map((step, i) => (
        <span key={step.path} className="link-strip-item">
          <Link
            to={step.path}
            className={"link-strip-pill" + (location.pathname === step.path ? " current" : "")}
          >
            {step.label}
          </Link>
          {i < STEPS.length - 1 && <span className="link-strip-arrow">←</span>}
        </span>
      ))}
    </div>
  );
}
