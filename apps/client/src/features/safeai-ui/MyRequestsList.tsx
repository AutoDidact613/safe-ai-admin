import '../../styles/safeai-ui.css';
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useState, useEffect } from "react";
import { apiCall, API_ENDPOINTS } from "../../config/api";

interface MyRequestsListProps {
  activeSection: string;
}

type Reply = {
  senderRole: string;
};

type Request = {
  _id: string;
  title?: string;
  requestType?: string;
  status: string;
  createdAt: string;
  replies?: Reply[];
};

export default function MyRequestsList({ activeSection }: MyRequestsListProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCall<Request[]>(API_ENDPOINTS.myRequests, { method: "GET" });
      setRequests(data || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(t("requests.loadMyRequestsFailedError"));
    } finally {
      setLoading(false);
    }
  };

  const hasNewAdminReply = (req: Request) => {
    const replies = req.replies || [];
    if (replies.length === 0) return false;
    return replies[replies.length - 1].senderRole === 'admin';
  };

  // הקוד ירוץ מחדש בכל פעם שה-activeSection משתנה ל-"requests"
  useEffect(() => {
    if (activeSection === "requests") {
      fetchRequests();
    }
  }, [activeSection]);

  if (loading) return <div className="loading">{t("userDashboard.loadingData")}</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="requests-wrapper">
      <div className="my-requests-list requests-table-container">
        <h3>{t("requests.myRequestsTitle")}</h3>
        {requests.length === 0 ? (
          <p>{t("requests.noActiveRequests")}</p>
        ) : (
          <table className="requests-table">
            <thead>
              <tr>
                <th></th>
                <th>{t("requests.subjectColumn")}</th>
                <th>{t("requests.requestTypeColumn")}</th>
                <th>{t("requests.dateColumn")}</th>
              </tr>
            </thead>
            <tbody>
              {requests.filter((req) => req.status !== 'closed').map((req) => (
                <tr
                  key={req._id}
                  onClick={() => navigate(`/request/${req._id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    {hasNewAdminReply(req) && <span className="request-new-badge request-new-icon">{t("requests.newReplyBadge")}</span>}
                  </td>
                  <td>{req.title || t("requests.noSubject")}</td>
                  <td>
                    <span className="request-type-badge">{req.requestType || req.status || t("requests.unknownValue")}</span>
                  </td>
                  <td>{new Date(req.createdAt).toLocaleDateString("he-IL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
