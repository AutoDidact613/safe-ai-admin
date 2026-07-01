import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getAllOrganizations,
  suspendOrganization,
  activateOrganization,
} from "../api/organizationApi";
import type { AdminOrganization } from "../api/organizationApi";
import { OrganizationsTable } from "../components/OrganizationsTable";
import "../../../styles/organizations-admin.css";

type StatusFilter = "all" | "active" | "suspended" | "pending" | "approved" | "rejected";

export const AllOrganizationsPage = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await getAllOrganizations();
      setOrganizations(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "נכשלה טעינת הארגונים");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const filtered = useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch = org.name.toLowerCase().includes(search.trim().toLowerCase());
      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = org.isActive === true;
      else if (statusFilter === "suspended") matchesStatus = org.isActive === false;
      else if (statusFilter !== "all") matchesStatus = org.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [organizations, search, statusFilter]);

  const handleSuspend = async (id: string) => {
    if (!window.confirm("להשעות את הארגון? משתמשי הארגון לא יוכלו להשתמש ב-API.")) return;
    try {
      setBusyId(id);
      await suspendOrganization(id);
      setOrganizations((prev) => prev.map((o) => (o._id === id ? { ...o, isActive: false } : o)));
    } catch (err: unknown) {
      alert(`שגיאה בהשעיה: ${err instanceof Error ? err.message : "נכשל"}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      setBusyId(id);
      await activateOrganization(id);
      setOrganizations((prev) => prev.map((o) => (o._id === id ? { ...o, isActive: true } : o)));
    } catch (err: unknown) {
      alert(`שגיאה בהפעלה: ${err instanceof Error ? err.message : "נכשל"}`);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="orgs-loading">טוען ארגונים...</div>;
  if (error) return <div className="orgs-error">שגיאה: {error}</div>;

  return (
    <div className="orgs-admin-container">
      <div className="orgs-admin-header">
        <h1 className="orgs-admin-title">ניהול ארגונים</h1>
        <Link className="orgs-admin-link" to="/admin/organizations">← ארגונים ממתינים לאישור</Link>
      </div>
      <p className="orgs-admin-subtitle">רשימת כל הארגונים במערכת. סה"כ: {organizations.length}</p>

      <div className="orgs-toolbar">
        <input
          className="orgs-search"
          type="text"
          placeholder="חיפוש לפי שם ארגון..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="orgs-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">כל הסטטוסים</option>
          <option value="active">פעיל</option>
          <option value="suspended">מושעה</option>
          <option value="pending">ממתין לאישור</option>
          <option value="approved">מאושר</option>
          <option value="rejected">נדחה</option>
        </select>
      </div>

      <OrganizationsTable
        organizations={filtered}
        onOpen={(id) => navigate(`/admin/organizations/${id}`)}
        onSuspend={handleSuspend}
        onActivate={handleActivate}
        busyId={busyId}
      />
    </div>
  );
};
