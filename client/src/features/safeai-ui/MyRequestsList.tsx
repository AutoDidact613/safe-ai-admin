import '../../styles/safeai-ui.css';
import { useNavigate } from "react-router-dom";

import { useState, useEffect } from "react";
import { apiCall, API_ENDPOINTS } from "../../config/api";

interface MyRequestsListProps {
  activeSection: string;
}

export default function MyRequestsList({ activeSection }: MyRequestsListProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCall<any[]>(API_ENDPOINTS.myRequests, { method: "GET" });
      setRequests(data || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError("לא הצלחנו לטעון את הפניות. נסי שוב מאוחר יותר.");
    } finally {
      setLoading(false);
    }
  };

  // הקוד ירוץ מחדש בכל פעם שה-activeSection משתנה ל-"requests"
  useEffect(() => {
    if (activeSection === "requests") {
      fetchRequests();
    }
  }, [activeSection]);

  if (loading) return <div className="loading">טוען נתונים...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="my-requests-list">
      <h3>הפניות שלי</h3>
      {requests.length === 0 ? (
        <p>אין לך פניות פעילות כרגע.</p>
      ) : (
        <table className="requests-table">
          <thead>
            <tr>

              <th>נושא</th>
              <th>סוג הפנייה</th>
              <th>תאריך</th>
            </tr>
          </thead>
          <tbody>
              {requests.filter((req) => req.status !== 'closed')
              .map((req) => (
                <tr 
                  key={req._id} 
                  onClick={() => navigate(`/request/${req._id}`)} 
                  style={{ cursor: 'pointer' }}
                >
                  <td>{req.title || "ללא נושא"}</td>
                  <td>{req.requestType || req.status || "לא ידוע"}</td>
                  <td>{new Date(req.createdAt).toLocaleDateString("he-IL")}</td>
                </tr>
              ))}
            </tbody>
        </table>
      )}
    </div>
  );
}