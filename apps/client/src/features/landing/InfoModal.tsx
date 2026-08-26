import { useEffect, type ReactNode } from "react";
import "../../styles/info-modal.css";
import { CloseIcon } from "./icons";

interface InfoModalProps {
  icon: ReactNode;
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimaryAction?: () => void;
  onClose: () => void;
}

export default function InfoModal({
  icon,
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
          <CloseIcon size={13} />
        </button>
        <div className="info-modal-icon">{icon}</div>
        <h3 className="info-modal-title">{title}</h3>
        <p className="info-modal-message">{message}</p>
        <div className="info-modal-actions">
          {primaryLabel && onPrimaryAction && (
            <button className="lv2-btn lv2-btn-primary lv2-btn-sm" onClick={onPrimaryAction}>
              {primaryLabel}
            </button>
          )}
          <button className="lv2-btn lv2-btn-ghost lv2-btn-sm" onClick={onClose}>
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}
