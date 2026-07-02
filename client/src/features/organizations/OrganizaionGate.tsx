import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getMyOrganization, AdminOrganization } from "./api/organizationApi";
import { OrganizationRequestForm } from "./OrganizationRequestForm";
import { PendingApprovalScreen } from "./PendingApprovalScreen";

export const OrganizationGate = () => {
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<AdminOrganization | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getMyOrganization()
      .then((res) => {
        if (mounted) setOrg(res.organization);
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "שגיאה בטעינת נתוני הארגון");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="orgs-loading">טוען...</div>;
  if (error) return <div className="orgs-error">{error}</div>;

  if (!org) {
    return <OrganizationRequestForm />;
  }

  if (org.status !== "approved" || !org.isActive) {
    return <PendingApprovalScreen orgName={org.name} />;
  }

  return <Navigate to="/organization/users" replace />;
};