import { useNavigate } from "react-router-dom";
import { CheckIcon } from "../landing/icons";

interface ChecklistStepProps {
  step: number;
  label: string;
  description: string;
  done: boolean;
  path: string;
}

export default function ChecklistStep({ step, label, description, done, path }: ChecklistStepProps) {
  const navigate = useNavigate();

  return (
    <button
      className={`dash-getstarted-step${done ? " dash-getstarted-step-done" : ""}`}
      onClick={() => navigate(path)}
    >
      <span className="dash-getstarted-marker" aria-hidden="true">
        {done ? <CheckIcon size={16} /> : step}
      </span>
      <span className="dash-getstarted-text">
        <span className="dash-getstarted-title">
          {label}
          {/* The checkmark and strikethrough are visual-only cues — a screen
              reader needs the completion state spelled out. */}
          <span className="lv2-sr-only">{done ? " — הושלם" : " — טרם הושלם"}</span>
        </span>
        <span className="dash-getstarted-desc">{description}</span>
      </span>
    </button>
  );
}
