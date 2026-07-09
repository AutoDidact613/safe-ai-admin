//חששששששששששששששששוווווובבבבבבבבבבבבבבב!!!!!!!!!!!!!!!!!!!!!!!1
// אם בסוף קישורי השפה הם משתנים צריך להוסיף את כל מה שבהערה חוץ מהחלק של הRETURN שצריך למחוק ולהשים במקומו את החלק שבהערה
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
//   alternateUrl?: string;
}

const DEFAULT_DESCRIPTION = "פלטפורמת SafeAI613 מציעה צ'אט AI מתקדם ומסונן, קורסים והדרכות מקצועיות, חדשות טכנולוגיה וקהילה מבוקרת המותאמת באופן מלא למשתמשי נטפרי והמגזר החרדי.";
const DEFAULT_KEYWORDS = "SafeAI613, צ'אט AI מסונן, בינה מלאכותית מבוקרת, AI לנטפרי, קורסים AI, חדשות AI, פורום טכנולוגי חרדי, אינטרנט נקי, מודלי שפה מוגנים";
const SITE_NAME = "SafeAI613";
const DEFAULT_OG_IMAGE = "/og-default.png";

export const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  canonicalUrl,
  ogImage = DEFAULT_OG_IMAGE,
  noIndex = false,
//   lang = 'he',
//   alternateUrl,
}) => {
//   const dir = lang === 'he' ? 'rtl' : 'ltr';
//   const otherLang = lang === 'he' ? 'en' : 'he';
  const mainTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - צ'אט ופלטפורמת בינה מלאכותית מבוקרת ומסוננת`;

  return (
    <Helmet
      // REMARK: hardcoded to Hebrew/RTL for now because there is only
      // one URL per page. If different links are discovered, this
      // must become dynamic — see alternate version below.
      htmlAttributes={{ lang: 'he', dir: 'rtl' }}
    >
      <title>{mainTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />

      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* REMARK: no hreflang tags here — do NOT add them until you
          confirm separate URLs exist per language. Adding hreflang
          without real separate URLs can confuse search engines. */}

      <meta property="og:title" content={mainTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      {ogImage && <meta property="og:image" content={ogImage} />}
    </Helmet>
  );

//   return (
//     <Helmet htmlAttributes={{ lang, dir }}>
//       <title>{mainTitle}</title>
//       <meta name="description" content={description} />
//       <meta name="keywords" content={keywords} />
//       <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />

//       {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

//       {/* hreflang tags — only meaningful because separate URLs exist */}
//       {canonicalUrl && <link rel="alternate" hrefLang={lang} href={canonicalUrl} />}
//       {alternateUrl && <link rel="alternate" hrefLang={otherLang} href={alternateUrl} />}
//       {canonicalUrl && <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />}

//       <meta property="og:title" content={mainTitle} />
//       <meta property="og:description" content={description} />
//       <meta property="og:type" content="website" />
//       <meta property="og:site_name" content={SITE_NAME} />
//       {ogImage && <meta property="og:image" content={ogImage} />}
//     </Helmet>
//   );

};