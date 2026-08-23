import { Link } from "react-router-dom";
import "../styles/beta-banner.css";

export default function BetaBanner() {
  return (
    <div className="beta-banner">
      <div className="beta-banner-container">
        <div className="beta-badge">BETA</div>
        <p className="beta-text">
          המערכת בהרצה ניסיונית • גרסה חדשה כל שבוע •{" "}
          <Link to="/contact" className="beta-link">
            שתפו אותנו במשוב שלכם
          </Link>
        </p>
      </div>
    </div>
  );
}
