import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiCall, API_ENDPOINTS } from "../../config/api";

interface WalletTransactionStatus {
  status: "pending" | "completed" | "failed";
  amount: number;
  currency: string;
}

interface OrganizationDetail {
  walletBalance?: number;
}

type ViewState =
  | { phase: "loading" }
  | { phase: "success"; walletBalance: number }
  | { phase: "failed" }
  | { phase: "error"; message: string };

/**
 * Landing page PayMe redirects the browser to after a wallet top-up
 * attempt (GoodURL/ErrorURL, built per-request in paymeClient.ts). The
 * transaction's real status (from our own DB, not just which URL PayMe
 * happened to redirect to) decides what's shown - PayMe's redirect
 * choice is a hint, not the source of truth.
 */
export default function PaymeResultPage() {
  const { id: organizationId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestId = searchParams.get("requestId");

  const [view, setView] = useState<ViewState>(() =>
    organizationId && requestId
      ? { phase: "loading" }
      : { phase: "error", message: "חסרים פרטי עסקה" }
  );

  useEffect(() => {
    if (!organizationId || !requestId) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { transaction } = await apiCall<{ transaction: WalletTransactionStatus }>(
          API_ENDPOINTS.payme.status(organizationId, requestId)
        );

        if (cancelled) return;

        if (transaction.status === "completed") {
          const organization = await apiCall<OrganizationDetail>(
            API_ENDPOINTS.adminOrganizations.detail(organizationId)
          );
          if (cancelled) return;
          setView({ phase: "success", walletBalance: organization.walletBalance ?? 0 });
        } else if (transaction.status === "failed") {
          setView({ phase: "failed" });
        } else {
          // Still pending - webhook hasn't landed yet. Rare in practice
          // since PayMe redirects the browser after the webhook fires,
          // but treat it as a failure to be safe rather than claim success.
          setView({ phase: "failed" });
        }
      } catch (err) {
        if (!cancelled) {
          setView({
            phase: "error",
            message: err instanceof Error ? err.message : "שגיאה בבדיקת סטטוס התשלום",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId, requestId]);

  if (view.phase === "loading") {
    return (
      <div className="auth-form-container">
        <div className="auth-form-wrapper">
          <div role="status" aria-live="polite" style={{ textAlign: "center", padding: "40px" }}>
            <div className="spinner" style={{ margin: "0 auto 20px" }}></div>
            <h2>בודק את סטטוס התשלום...</h2>
            <p style={{ color: "#666" }}>אנא המתן</p>
          </div>
        </div>
      </div>
    );
  }

  if (view.phase === "success") {
    return (
      <div className="auth-form-container">
        <div className="auth-form-wrapper">
          <div role="status" aria-live="polite" style={{ textAlign: "center", padding: "40px" }}>
            <h2>הטעינה הצליחה!</h2>
            <p>יתרת הארנק המעודכנת: <strong>{view.walletBalance.toFixed(2)}</strong></p>
            <button className="btn-primary" onClick={() => navigate("/organization/users")}>
              חזרה לניהול הארגון
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form-container">
      <div className="auth-form-wrapper">
        <div role="status" aria-live="polite" style={{ textAlign: "center", padding: "40px" }}>
          <h2>הטעינה נכשלה</h2>
          <p style={{ color: "#666" }}>
            {view.phase === "error" ? view.message : "התשלום לא הושלם או בוטל."}
          </p>
          <button className="btn-primary" onClick={() => navigate("/organization/users")}>
            נסה שוב
          </button>
        </div>
      </div>
    </div>
  );
}
