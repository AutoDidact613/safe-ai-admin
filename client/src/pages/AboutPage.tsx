import { useTranslation } from "react-i18next";
import "../styles/about-page.css";

export default function AboutPage() {
  const { t } = useTranslation();
  return (
    <div className="about-page">
      <div className="about-container">
        <h1>AI 2026</h1>

        <section className="about-section">
          <h2>{t("about.backgroundHeading")}</h2>
          <p>{t("about.backgroundP1")}</p>
          <p>
            {t("about.backgroundP2Line1")}
            <br />
            {t("about.backgroundP2Line2")}
            <br />
            {t("about.backgroundP2Line3")}
          </p>
          <p>
            {t("about.backgroundP3Line1")}
            <br />
            {t("about.backgroundP3Line2")}
            <br />
            {t("about.backgroundP3Line3")}
            <br /> {t("about.backgroundP3Line4")} <br />
            {t("about.backgroundP3Line5")}
          </p>
          <p>
            {t("about.backgroundP4")}
          </p>
        </section>

        <section className="about-section">
          <p>
            {t("about.valuesP1Line1")} <br />
            {t("about.valuesP1Line2")}
            <br />
            <br />
            {t("about.valuesP1Line3")}
            <br />
            {t("about.valuesP1Line4")}
          </p>
          <p>
            {t("about.valuesP2")}
          </p>
          <ul>
            <li>{t("about.valuesList1")}</li>
            <li>{t("about.valuesList2")}</li>
          </ul>
          <p>
            {t("about.valuesP3Line1")}
            <br />
            {t("about.valuesP3Line2")}
          </p>
        </section>

        <section className="about-section">
          <h2>{t("about.marketHeading")}</h2>
          <p>
            {t("about.marketPLine1")} <br />
            {t("about.marketPLine2")}
            <br />
            {t("about.marketPLine3")}
          </p>
        </section>

        <section className="about-section">
          <h2>{t("about.problemHeading")}</h2>
          <p>
            {t("about.problemPLine1")}
            <br />
            {t("about.problemPLine2")}
            <br />
            {t("about.problemPLine3")}
          </p>
        </section>

        <section className="about-section">
          <h2>{t("about.goalHeading")}</h2>
          <p>
            {t("about.goalPLine1")}
            <br />
            {t("about.goalPLine2")}
          </p>
        </section>

        <section className="about-section">
          <h2>{t("about.directionHeading")}</h2>
          <p>
            {t("about.directionPLine1")}
            <br />
            {t("about.directionPLine2")}
            <br />
            {t("about.directionPLine3")}
            <br />
            <br />
            {t("about.directionPLine4")}
            <br />
            {t("about.directionPLine5")}
          </p>
        </section>

        <section className="about-section">
          <h2>{t("about.implementationHeading")}</h2>

          <h3>{t("about.filteringSubheading")}</h3>
          <ul>
            <li>{t("about.filteringList1")} </li>
            <li>
              {t("about.filteringList2")}
            </li>
          </ul>

          <h3>{t("about.goalProductsSubheading")}</h3>
          <p>
            {t("about.goalProductsPLine1")}
            <br />
            {t("about.goalProductsPLine2")}
            <br />
            {t("about.goalProductsPLine3")}
            <br />
            {t("about.goalProductsPLine4")}
            <br />
            {t("about.goalProductsPLine5")}
            <br />
            {t("about.goalProductsPLine6")}
            <br />
            {t("about.goalProductsPLine7")}
          </p>
          <p>
            {t("about.asidePLine1")} <br />
            {t("about.asidePLine2")}
          </p>

          <h3>{t("about.providerSubheading")}</h3>
          <p>
            {t("about.providerP")}
          </p>
          <svg
            width="800"
            height="270"
            viewBox="0 0 800 500"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                id="shieldGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#10a37f" stopOpacity="1" />
                <stop offset="100%" stopColor="#0d8f6f" stopOpacity="1" />  
              </linearGradient>

              <filter
                id="softShadow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="3"
                  stdDeviation="4"
                  flood-opacity="0.2"
                />
              </filter>
            </defs>

            <g transform="translate(60, 50)">
              <path
                d="M0 400 V100 C0 20, 280 20, 280 100 V400"
                fill="none"
                stroke="#999"
                stroke-width="5"
              />

              <g stroke="#bbb" stroke-width="2">
                <line x1="40" y1="55" x2="40" y2="400" />
                <line x1="100" y1="35" x2="100" y2="400" />
                <line x1="180" y1="35" x2="180" y2="400" />
                <line x1="240" y1="55" x2="240" y2="400" />
                <path d="M2 150 H278 M2 280 H278" stroke="#ccc" />
              </g>

              <g
                font-family="Arial"
                font-size="14"
                font-weight="bold"
                text-anchor="middle"
              >
                <rect
                  x="45"
                  y="135"
                  width="190"
                  height="30"
                  rx="4"
                  fill="#666"
                />
                <text x="140" y="155" fill="#ff9999">
                  api.openai.com
                </text>

                <rect
                  x="45"
                  y="220"
                  width="190"
                  height="30"
                  rx="4"
                  fill="#666"
                />
                <text x="140" y="240" fill="#ff9999">
                  api.google.com
                </text>

                <rect
                  x="45"
                  y="305"
                  width="190"
                  height="30"
                  rx="4"
                  fill="#666"
                />
                <text x="140" y="325" fill="#ff9999">
                  api.anthropic.com
                </text>
              </g>
            </g>

            <g transform="translate(460, 50)">
              <path
                d="M0 400 V100 C0 20, 280 20, 280 100 V400"
                fill="none"
                stroke="#999"
                stroke-width="5"
              />

              <path
                d="M280 100 C280 20, 450 60, 450 140 V420 L280 400"
                fill="#fafafa"
                stroke="#ccc"
                stroke-width="2"
              />
              <line
                x1="280"
                y1="200"
                x2="450"
                y2="240"
                stroke="#ddd"
                stroke-width="2"
              />
              <line
                x1="280"
                y1="300"
                x2="450"
                y2="340"
                stroke="#ddd"
                stroke-width="2"
              />

              <g transform="translate(20, 80)" filter="url(#softShadow)">
                <path
                  d="M120 15 C 145 15, 155 5, 175 5 L 200 5 V 110 C 200 160, 120 195, 120 195 C 120 195, 40 160, 40 110 V 5 L 65 5 C 85 5, 95 15, 120 15 Z"
                  fill="url(#shieldGradient)"
                />

                <text
                  x="120"
                  y="112"
                  font-family="'Segoe UI', Tahoma, sans-serif"
                  font-size="16"
                  font-weight="900"
                  fill="#ffffff"
                  text-anchor="middle"
                >
                  https://safeai613.com/v1
                </text>
              </g>
            </g>
          </svg>
        </section>

        <section className="about-section">
          <h2>{t("about.whyNotHeading")}</h2>
          <p>
            {t("about.whyNotPLine1")}
            <br />
            {t("about.whyNotPLine2")}
            <br />
            {t("about.whyNotPLine3")}
            <br />
            {t("about.whyNotPLine4")}
            <br />
            <br />
            <br />
            {t("about.whyNotPLine5")}
            <br />
            {t("about.whyNotPLine6")}
            <br />
            {t("about.whyNotPLine7")}
          </p>
          <ul>
            <li>{t("about.whyNotList1")}</li>
            <li>{t("about.whyNotList2")}</li>
            <li>{t("about.whyNotList3")}</li>
            <li>{t("about.whyNotList4")}</li>
          </ul>
        </section>

        <section className="about-cta">
          <h2>{t("about.ctaHeading")}</h2>
          <p>{t("about.ctaP")}</p>
          <a
            href="https://safeai613.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            https://safeai613.github.io/
          </a>

          <h3>{t("about.knowledgeHeading")}</h3>
          <p>
            {t("about.knowledgePLine1")}
            <br />
            {t("about.knowledgePLine2")}
            <br />
            {t("about.knowledgePLine3")}
            <br />
            {t("about.knowledgePLine4")}
          </p>
        </section>
      </div>
    </div>
  );
}
