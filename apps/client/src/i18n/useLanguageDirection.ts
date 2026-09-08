import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const RTL_LANGUAGES = ["he"];

export function useLanguageDirection() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const direction = RTL_LANGUAGES.includes(i18n.language) ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", direction);
    document.documentElement.setAttribute("lang", i18n.language);
  }, [i18n.language]);
}