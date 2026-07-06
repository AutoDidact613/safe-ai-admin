import { useTranslation } from "react-i18next";
import "../styles/language-switcher.css";

function IsraelFlag() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" className="flag-icon">
      <rect width="22" height="16" fill="#ffffff" />
      <rect y="2" width="22" height="2.5" fill="#0038b8" />
      <rect y="11.5" width="22" height="2.5" fill="#0038b8" />
      <path
  d="M11 6.2 L12.8 9.3 L9.2 9.3 Z"
  fill="none"
  stroke="#0038b8"
  strokeWidth="0.5"
/>
<path
  d="M11 9.8 L9.2 6.7 L12.8 6.7 Z"
  fill="none"
  stroke="#0038b8"
  strokeWidth="0.5"
/>
    </svg>
  );
}

function UsaFlag() {
  const starPath =
    "M0,-0.42 L0.12,-0.13 L0.42,-0.13 L0.19,0.05 L0.26,0.37 L0,0.19 L-0.26,0.37 L-0.19,0.05 L-0.42,-0.13 L-0.12,-0.13 Z";
  const starPositions: [number, number][] = [
    [1.3, 1.1], [3.4, 1.1], [5.5, 1.1], [7.6, 1.1],
    [2.35, 3.3], [4.45, 3.3], [6.55, 3.3],
    [1.3, 5.5], [3.4, 5.5], [5.5, 5.5], [7.6, 5.5],
    [2.35, 7.5], [4.45, 7.5], [6.55, 7.5],
  ];

  return (
    <svg width="22" height="16" viewBox="0 0 22 16" className="flag-icon">
      <rect width="22" height="16" fill="#b31942" />
      <rect width="22" height="1.2308" y="1.2308" fill="#ffffff" />
      <rect width="22" height="1.2308" y="3.6923" fill="#ffffff" />
      <rect width="22" height="1.2308" y="6.1538" fill="#ffffff" />
      <rect width="22" height="1.2308" y="8.6154" fill="#ffffff" />
      <rect width="22" height="1.2308" y="11.0769" fill="#ffffff" />
      <rect width="22" height="1.2308" y="13.5385" fill="#ffffff" />
      <rect width="9" height="8.6" fill="#0a3161" />
      <g fill="#ffffff">
        {starPositions.map(([x, y], i) => (
          <path key={i} transform={`translate(${x},${y})`} d={starPath} />
        ))}
      </g>
    </svg>
  );
}

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const LANGUAGES = [
    { code: "he", label: t("langSwitcher.hebrewLabel"), flag: IsraelFlag },
    { code: "en", label: "English - EN", flag: UsaFlag },
  ] as const;
  const currentCode = i18n.language === "he" ? "he" : "en";

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("language", code);
  };

  const current = LANGUAGES.find((l) => l.code === currentCode) ?? LANGUAGES[0];
  const others = LANGUAGES.filter((l) => l.code !== currentCode);
  const CurrentFlag = current.flag;

  return (
    <div className="language-switcher">
      <button type="button" className="language-switcher-trigger">
        <CurrentFlag />
        <span className="language-switcher-code">{current.code.toUpperCase()}</span>
        <svg
          className="language-switcher-arrow"
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="language-switcher-menu">
        <div className="language-switcher-item language-switcher-item-active">
          <CurrentFlag />
          <span>{current.label}</span>
        </div>
        {others.map((lang) => {
          const Flag = lang.flag;
          return (
            <button
              key={lang.code}
              type="button"
              className="language-switcher-item"
              onClick={() => changeLanguage(lang.code)}
            >
              <Flag />
              <span>{lang.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}