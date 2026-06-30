import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOrganization } from "../api/organizationApi";

export default function CreateOrganizationPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      await createOrganization({
        name,
        description,
      });

      navigate("/organization/pending");
    } catch (err) {
      console.error(err);
      alert("יצירת הארגון נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>יצירת ארגון</h2>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="שם הארגון"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <textarea
          placeholder="תיאור"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button disabled={loading}>
          {loading ? "שולח..." : "שלח בקשה"}
        </button>
      </form>
    </div>
  );
}