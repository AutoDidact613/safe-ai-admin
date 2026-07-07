import "../../styles/organizations-admin.css";

export const PendingApprovalScreen = ({ orgName }: { orgName?: string }) => {
  return (
    <div className="orgs-admin-container">
      <div className="org-pending-card">
        <h2>⏳ ממתין לאישור</h2>
        <p>הארגון {orgName ? <strong>{orgName}</strong> : "שלך"} נמצא בהמתנה לאישור מנהל המערכת.</p>
        <p>לאחר האישור יופעל הארגון ותקבל/י גישה מלאה למסך ניהול הארגון. נעדכן אותך במייל.</p>
      </div>
    </div>
  );
};
