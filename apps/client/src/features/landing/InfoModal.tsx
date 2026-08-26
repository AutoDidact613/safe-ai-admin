import { useEffect } from "react";
import "../../styles/info-modal.css";

interface InfoModalProps {
  icon?: string;
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimaryAction?: () => void;
  onClose: () => void;
}

export default function InfoModal({
  icon = "ℹ️",
  title,
  message,
  primaryLabel,
  onPrimaryAction,
  onClose,
}: InfoModalProps) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="info-modal-overlay" onClick={onClose}>
      <div
        className="info-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="info-modal-close" onClick={onClose} aria-label="סגור">
          ✕
        </button>
        <div className="info-modal-icon">{icon}</div>
        <h3 className="info-modal-title">{title}</h3>
        <p className="info-modal-message">{message}</p>
        <div className="info-modal-actions">
          {primaryLabel && onPrimaryAction && (
            <button className="btn btn-primary" onClick={onPrimaryAction}>
              {primaryLabel}
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}
