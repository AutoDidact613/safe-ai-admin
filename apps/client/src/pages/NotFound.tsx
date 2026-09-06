import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();
  return <h2>{t("notFound.message")}</h2>;
}
