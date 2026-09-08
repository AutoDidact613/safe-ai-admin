import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../styles/safeai-ui.css";

interface DevelopmentModalProps {
  show: boolean;
}

export default function DevelopmentModal({ show }: DevelopmentModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!show) return null;

  const handleGoToSafeAI = () => {
    navigate("/safeai-ui");
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: "500px", textAlign: "center" }}>
        <div className="modal-header" style={{ flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <h2 style={{ fontSize: "24px", margin: 0 }}>{t("devModal.title")}</h2>
        </div>
        <div style={{ padding: "20px 0" }}>
          <p style={{ fontSize: "18px", lineHeight: "1.6", margin: 0, color: "var(--text-primary)" }}>
            {t("devModal.description")}
          </p>
        </div>
        <div className="modal-footer" style={{ justifyContent: "center", marginTop: "24px" }}>
          <button className="btn btn-primary" onClick={handleGoToSafeAI}>
            {t("devModal.backButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
