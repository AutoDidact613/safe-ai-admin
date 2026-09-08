import { useTranslation } from "react-i18next";

export default function Products() {
  const { t } = useTranslation();
  const developerVideoUrl = import.meta.env.VITE_DEVELOPER_VIDEO_URL;
  const developerVideo2Url = import.meta.env.VITE_DEVELOPER_VIDEO2_URL;

  return (
    <div className="products">
      <h2>{t("products.heading")}</h2>
      <p className="products-intro">
        {t("products.intro")}
      </p>

      {/* Video Sections */}
      {developerVideoUrl && (
        <div className="about-section video-section">
          <h3>🎥 {t("products.byokVideoTitle")}</h3>
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
          <h3>🎥 {t("products.integrationVideoTitle")}</h3>
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
            {t("products.proxyP")}
          </p>
          <ul className="product-features">
            <li>{t("products.proxyFeature1")}</li>
            <li>{t("products.proxyFeature2")}</li>
            <li>{t("products.proxyFeature3")}</li>
            <li>{t("products.proxyFeature4")}</li>
          </ul>
          <div className="product-links">
            <a
              href="https://github.com/SafeAI613/SafeAI-613"
              target="_blank"
              rel="noopener noreferrer"
              className="product-link"
            >
              📦 {t("products.githubRepoLink")}
            </a>
          </div>
        </div>

        <div className="product-card">
          <div className="product-icon">�</div>
          <h3>LibreChat-613</h3>
          <p>
            {t("products.libreChatP")}
          </p>
          <ul className="product-features">
            <li>{t("products.libreChatFeature1")}</li>
            <li>{t("products.libreChatFeature2")}</li>
            <li>{t("products.libreChatFeature3")}</li>
            <li>{t("products.libreChatFeature4")}</li>
          </ul>
          <div className="product-links">
            <a
              href="https://github.com/SafeAI613/LibreChat-613"
              target="_blank"
              rel="noopener noreferrer"
              className="product-link"
            >
              📦 {t("products.githubRepoLink")}
            </a>
            <a
              href="https://ai613.autodidact.co.il/"
              target="_blank"
              rel="noopener noreferrer"
              className="product-link demo-link"
            >
              🌐 {t("products.liveDemoLink")}
            </a>
          </div>
        </div>

        <div className="product-card">
          <div className="product-icon">�</div>
          <h3>SafeAI-SDK (Python)</h3>
          <p>
            {t("products.sdkP")}
          </p>
          <ul className="product-features">
            <li>{t("products.sdkFeature1")}</li>
            <li>{t("products.sdkFeature2")}</li>
            <li>{t("products.sdkFeature3")}</li>
            <li>{t("products.sdkFeature4")}</li>
          </ul>
          <div className="product-links">
            <a
              href="https://github.com/SafeAI613/SafeAI-SDK"
              target="_blank"
              rel="noopener noreferrer"
              className="product-link"
            >
              📦 {t("products.githubRepoLink")}
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
            {t("products.continueP")}
          </p>
          <ul className="product-features">
            <li>{t("products.continueFeature1")}</li>
            <li>{t("products.continueFeature2")}</li>
            <li>{t("products.continueFeature3")}</li>
            <li>{t("products.continueFeature4")}</li>
          </ul>
          <div className="product-links">
            <a
              href="https://github.com/SafeAI613/Continue-613"
              target="_blank"
              rel="noopener noreferrer"
              className="product-link"
            >
              📦 {t("products.githubRepoLink")}
            </a>
            <a
              href="https://marketplace.visualstudio.com/items?itemName=AutoDidact613.continue613"
              target="_blank"
              rel="noopener noreferrer"
              className="product-link demo-link"
            >
              🔌 {t("products.vsCodeMarketplaceLink")}
            </a>
          </div>
        </div>
      </div>

      <div className="future-projects">
        <h3>🚧 {t("products.futureProjectsTitle")}</h3>
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
              <p>{t("products.futureMcpDesc")}</p>
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
              <strong>{t("products.futureMoreTitle")}</strong>
              <p>{t("products.futureMoreDesc")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="products-cta">
        <h3>{t("products.ctaTitle")}</h3>
        <p>{t("products.ctaP")}</p>
        <a
          href="https://github.com/SafeAI613"
          target="_blank"
          rel="noopener noreferrer"
          className="cta-button"
        >
          🌟 {t("products.ctaButton")}
        </a>
      </div>
    </div>
  );
}
