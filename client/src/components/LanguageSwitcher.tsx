import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLanguage = i18n.language === "he" ? "en" : "he";
    i18n.changeLanguage(nextLanguage);
    localStorage.setItem("language", nextLanguage);
  };

  return (
    <button className="language-switcher" onClick={toggleLanguage}>
      {i18n.language === "he" ? "English" : "עברית"}
    </button>
  );
}