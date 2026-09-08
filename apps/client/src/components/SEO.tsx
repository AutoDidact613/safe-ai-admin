import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
}

const SITE_NAME = "SafeAI613";
const SITE_URL = "https://safeai613.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/banner_logo.png`;

// Renders per-page <title>/meta tags via react-helmet-async. Page language
// and dir are left to useLanguageDirection (src/i18n/useLanguageDirection.ts),
// which already keeps <html lang>/<html dir> in sync with i18next.
export function SEO({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage,
  noIndex = false,
}: SEOProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const resolvedOgImage = ogImage
    ? ogImage.startsWith("http")
      ? ogImage
      : `${SITE_URL}${ogImage}`
    : DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />

      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={resolvedOgImage} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedOgImage} />
    </Helmet>
  );
}
