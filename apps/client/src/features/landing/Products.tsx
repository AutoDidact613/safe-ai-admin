export default function Products() {
  const developerVideoUrl = import.meta.env.VITE_DEVELOPER_VIDEO_URL;
  const developerVideo2Url = import.meta.env.VITE_DEVELOPER_VIDEO2_URL;
  
  return (
    <div className="products">
      <h2>הפרויקטים שלנו</h2>
      <p className="products-intro">
        פרויקטי קוד פתוח לסינון ושימוש בטוח בבינה מלאכותית - כל הכלים זמינים ב-GitHub
      </p>

      {/* Video Sections */}
      {developerVideoUrl && (
        <div className="about-section video-section">
          <h3>🎥   BYOK ניהול מפתחות עצמאי</h3>
          <div className="video-container">
            <iframe
              src={developerVideoUrl.replace('/view?usp=drive_link', '/preview')}
              width="100%"
              height="480"
              allow="autoplay"
              allowFullScreen
              
            ></iframe>
          </div>
        </div>
      )}
      
      {developerVideo2Url && (
        <div className="about-section video-section">
          <h3>🎥   אינטגרציה עם אפליקציות וכלים חיצוניים</h3>
          <div className="video-container">
            <iframe
              src={developerVideo2Url.replace('/view?usp=drive_link', '/preview')}
              width="100%"
              height="480"
              allow="autoplay"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      <div className="products-grid">
        <div className="product-card">
          <div className="product-icon">🔒</div>
          <h3>SafeAI Proxy + Filter Server</h3>
          <p>
            פרוקסי וסרת סינון מתקדם המאפשר סינון בזמן אמת של בקשות ותגובות מ-API של 
            מודלי שפה. כולל ממשק ניהול, פרופילי סינון מותאמים אישית, ומערכת ניטור.
          </p>
          <ul className="product-features">
            <li>סינון בזמן אמת עם embedding similarity</li>
            <li>תמיכה בכל ספקי ה-AI המובילים</li>
            <li>ממשק ניהול ודוחות מפורטים</li>
            <li>ניהול משתמשים ופרופילים</li>
          </ul>
          <div className="product-links">
            <a 
              href="https://github.com/SafeAI613/SafeAI-613" 
              target="_blank" 
              rel="noopener noreferrer"
              className="product-link"
            >
              📦 GitHub Repository
            </a>
          </div>
        </div>

        <div className="product-card">
          <div className="product-icon">�</div>
          <h3>LibreChat-613</h3>
          <p>
            פתרון צ'אט מבוסס LibreChat עם סינון מובנה, מתאים למוסדות חינוך וארגונים.
            ממשק נוח, תמיכה מלאה בעברית, וחיבור לשרת הסינון שלנו.
          </p>
          <ul className="product-features">
            <li>ממשק משתמש אינטואיטיבי ומודרני</li>
            <li>תמיכה מלאה בעברית ובאנגלית</li>
            <li>אינטגרציה עם SafeAI Proxy</li>
            <li>תמיכה במודלים מרובים</li>
          </ul>
          <div className="product-links">
            <a 
              href="https://github.com/SafeAI613/LibreChat-613" 
              target="_blank" 
              rel="noopener noreferrer"
              className="product-link"
            >
              📦 GitHub Repository
            </a>
            <a 
              href="https://ai613.autodidact.co.il/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="product-link demo-link"
            >
              🌐 Live Demo
            </a>
          </div>
        </div>

        <div className="product-card">
          <div className="product-icon">�</div>
          <h3>SafeAI-SDK (Python)</h3>
          <p>
            חבילת Python להטמעת סינון תוכן AI ישירות באפליקציות. כוללת פונקציות סינון,
            אינטגרציה עם מודלי embedding, וכלים לבניית פרומפטים בטוחים.
          </p>
          <ul className="product-features">
            <li>התקנה פשוטה עם pip</li>
            <li>API ידידותי למפתחים</li>
            <li>תיעוד מקיף ודוגמאות קוד</li>
            <li>תמיכה בסינון טקסט ופרומפטים</li>
          </ul>
          <div className="product-links">
            <a 
              href="https://github.com/SafeAI613/SafeAI-SDK" 
              target="_blank" 
              rel="noopener noreferrer"
              className="product-link"
            >
              📦 GitHub Repository
            </a>
          </div>
          <div className="code-example">
            <code>pip install safeai-sdk</code>
          </div>
        </div>

        <div className="product-card">
          <div className="product-icon">�</div>
          <h3>Continue-613 Extension</h3>
          <p>
            תוסף ל-VS Code מבוסס Continue עם סינון מוטמע. מאפשר שימוש ב-AI coding assistant
            בצורה בטוחה ומסוננת ישירות בסביבת הפיתוח.
          </p>
          <ul className="product-features">
            <li>אינטגרציה מלאה עם VS Code</li>
            <li>סינון אוטומטי של קוד ופרומפטים</li>
            <li>תמיכה במודלים מקומיים ומרוחקים</li>
            <li>ממשק פשוט וידידותי</li>
          </ul>
          <div className="product-links">
            <a 
              href="https://github.com/SafeAI613/Continue-613" 
              target="_blank" 
              rel="noopener noreferrer"
              className="product-link"
            >
              📦 GitHub Repository
            </a>
            <a 
              href="https://marketplace.visualstudio.com/items?itemName=AutoDidact613.continue613" 
              target="_blank" 
              rel="noopener noreferrer"
              className="product-link demo-link"
            >
              🔌 VS Code Marketplace
            </a>
          </div>
        </div>
      </div>

      <div className="future-projects">
        <h3>🚧 פרויקטים בפיתוח</h3>
        <div className="future-grid">
          <div className="future-item">
            <span className="future-icon">🦙</span>
            <div>
              <strong>SafeOllama</strong>
              <p>Ollama with safe AI behaviour</p>
            </div>
          </div>
          <div className="future-item">
            <span className="future-icon">🔗</span>
            <div>
              <strong>SafeAI-MCP</strong>
              <p>גישה ליכולות הסינון דרך MCP Server</p>
            </div>
          </div>
          <div className="future-item">
            <span className="future-icon">📦</span>
            <div>
              <strong>SafeAI-node-SDK</strong>
              <p>SDK for Node.js/TypeScript</p>
            </div>
          </div>
          <div className="future-item">
            <span className="future-icon">✨</span>
            <div>
              <strong>ועוד...</strong>
              <p>רעיונות חדשים בדרך!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="products-cta">
        <h3>רוצים לתרום או להשתמש בפרויקטים?</h3>
        <p>כל הפרויקטים זמינים בקוד פתוח - הצטרפו לקהילה ב-GitHub!</p>
        <a 
          href="https://github.com/SafeAI613" 
          target="_blank" 
          rel="noopener noreferrer"
          className="cta-button"
        >
          🌟 בקרו ב-GitHub Organization
        </a>
      </div>
    </div>
  );
}
