import { useTranslation } from "react-i18next";
import { SEO } from "../components/SEO";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <>
      <SEO title={t("notFound.seoTitle")} description={t("notFound.message")} noIndex />
      <h2>{t("notFound.message")}</h2>
    </>
  );
}
