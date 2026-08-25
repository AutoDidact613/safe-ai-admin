import { Link } from "react-router-dom";
import "../styles/footer.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-container">
        <span className="site-footer-copyright">
          © {new Date().getFullYear()} SafeAI613
        </span>
        <Link to="/privacy" className="site-footer-link">
          מדיניות פרטיות
        </Link>
      </div>
    </footer>
  );
}
