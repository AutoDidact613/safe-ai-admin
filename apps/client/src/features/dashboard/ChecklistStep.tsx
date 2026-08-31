import { useNavigate } from "react-router-dom";
import { CheckIcon } from "../landing/icons";

interface ChecklistStepProps {
  step: number;
  label: string;
  done: boolean;
  path: string;
}

export default function ChecklistStep({ step, label, done, path }: ChecklistStepProps) {
  const navigate = useNavigate();

  return (
    <button className={`dash-checklist-step${done ? " dash-checklist-step-done" : ""}`} onClick={() => navigate(path)}>
      <span className="dash-checklist-marker" aria-hidden="true">
        {done ? <CheckIcon size={14} /> : step}
      </span>
      <span className="dash-checklist-label">{label}</span>
    </button>
  );
}
