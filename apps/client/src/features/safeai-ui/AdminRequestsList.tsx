import { useState, useEffect } from "react";
import { apiCall, API_ENDPOINTS } from "../../config/api";
import { useNavigate } from "react-router-dom";

type Reply = {
  senderRole: string;
};

type RequestUser = {
  _id?: string;
  name?: string;
  email?: string;
};

type Request = {
  _id: string;
  userId?: RequestUser | string;
  title?: string;
  status: string;
  replies?: Reply[];
};

type AgentInquiry = {
  id: string;
  title: string;
  urgency?: string;
};

type AgentRunListResult = {
  thread_id: string;
  inquiries: AgentInquiry[];
};

export default function AdminRequestsList() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [triggeringAgent, setTriggeringAgent] = useState(false);
  const [agentResultMessage, setAgentResultMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleTriggerAgent = async () => {
    setTriggeringAgent(true);
    setAgentResultMessage(null);
    try {
      const result = await apiCall<AgentRunListResult>(API_ENDPOINTS.inquiryAgent.runList, {
        method: "POST",
      });
      setAgentResultMessage(
        `סוכן ה-AI סיווג ${result.inquiries.length} פניות פתוחות (thread-id: ${result.thread_id})`,
      );
    } catch (err) {
      console.error("שגיאה בהפעלת סוכן ה-AI:", err);
      setAgentResultMessage(
        err instanceof Error ? `שגיאה בהפעלת סוכן ה-AI: ${err.message}` : "שגיאה בהפעלת סוכן ה-AI",
      );
    } finally {
      setTriggeringAgent(false);
    }
  };

  const isRequestNew = (req: Request) => {
    const hasAdminReply = req.replies?.some((reply: Reply) => reply.senderRole === "admin");
    return req.status === "open" && !hasAdminReply;
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("האם למחוק את הפנייה הזו לצמיתות?")) return;

    try {
      setDeletingRequestId(id);
      await apiCall(`${API_ENDPOINTS.contact}/${id}`, { method: "DELETE" });
      setRequests((prev) => prev.filter((req) => req._id !== id));
    } catch (err) {
      console.error("שגיאה במחיקת הפנייה:", err);
      alert("לא הצלחנו למחוק את הפנייה. נסה שוב.");
    } finally {
      setDeletingRequestId(null);
    }
  };

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiCall<Request[]>(API_ENDPOINTS.allRequests, { method: "GET" });
        setRequests(data || []);
      } catch (err) {
        console.error("שגיאה בטעינה:", err);
        setError("לא הצלחנו לטעון את כל הפניות. נסה שוב מאוחר יותר.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const triggerButton = (
    <div className="agent-trigger-section">
      <button className="btn btn-primary" onClick={handleTriggerAgent} disabled={triggeringAgent}>
        {triggeringAgent ? "מפעיל את סוכן ה-AI..." : "הפעל את סוכן ה-AI"}
      </button>
      {agentResultMessage && <p className="agent-trigger-message">{agentResultMessage}</p>}
    </div>
  );

  if (loading) {
    return (
      <div className="admin-requests-container">
        <h2>כל הפניות במערכת (מצב מנהל)</h2>
        {triggerButton}
        <p>טוען פניות...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-requests-container">
        <h2>כל הפניות במערכת (מצב מנהל)</h2>
        {triggerButton}
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="admin-requests-container">
      <h2>כל הפניות במערכת (מצב מנהל)</h2>
      {triggerButton}
      {requests.length === 0 ? (
        <p>אין פניות כרגע.</p>
      ) : (
        <table className="requests-table">
          <thead>
            <tr>
              <th></th>
              <th>משתמש</th>
              <th>דואר אלקטרוני</th>
              <th>נושא</th>
              <th>סטטוס</th>
              <th>מחק</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => {
              const newBadge = isRequestNew(req);
              const needsAdminAttention = req.status === "open" && (!req.replies || req.replies.length === 0 || req.replies[req.replies.length - 1].senderRole === "user");
              const userInfo = typeof req.userId === "object" ? req.userId : undefined;
              return (
                <tr key={req._id}>
                  <td>
                    {needsAdminAttention && (
                      <span className="request-new-badge request-new-icon">תגובה חדשה</span>
                    )}
                  </td>
                  <td onClick={() => navigate(`/request/${req._id}`)} style={{ cursor: "pointer" }}>
                    {userInfo?.name || "לא ידוע"}
                  </td>
                  <td onClick={() => navigate(`/request/${req._id}`)} style={{ cursor: "pointer" }}>
                    {userInfo?.email || "אין"}
                  </td>
                  <td onClick={() => navigate(`/request/${req._id}`)} style={{ cursor: "pointer" }}>
                    {req.title || "ללא נושא"}
                  </td>
                  <td onClick={() => navigate(`/request/${req._id}`)} style={{ cursor: "pointer" }}>
                    {req.status === "closed" ? "נסגרה" : "פתוחה"}
                    {newBadge && <span className="request-new-badge">חדש</span>}
                  </td>
                  <td>
                    <button
                      className="delete-request-btn"
                      onClick={() => handleDelete(req._id)}
                      disabled={deletingRequestId === req._id}
                      title="מחק פנייה"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19 6L18.3333 19.3333C18.3333 20.0512 17.7386 20.6458 17.0208 20.6458H6.97917C6.26126 20.6458 5.66667 20.0512 5.66667 19.3333L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 6V4.33333C8 3.61542 8.59459 3.02083 9.3125 3.02083H14.6875C15.4054 3.02083 16 3.61542 16 4.33333V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
