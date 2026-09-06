import { useTranslation } from "react-i18next";
import "../../styles/organizations-admin.css";

export const PendingApprovalScreen = ({ orgName }: { orgName?: string }) => {
  const { t } = useTranslation();
  return (
    <div className="orgs-admin-container">
      <div className="org-pending-card">
        <h2>{t("organizations.pendingScreenTitle")}</h2>
        <p>{t("organizations.pendingScreenPrefix")} {orgName ? <strong>{orgName}</strong> : t("organizations.pendingScreenYours")} {t("organizations.pendingScreenSuffix")}</p>
        <p>{t("organizations.pendingScreenFooter")}</p>
      </div>
    </div>
  );
};
