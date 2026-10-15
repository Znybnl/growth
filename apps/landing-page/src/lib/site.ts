import type { Metadata } from "next";

export const SITE_URL = "https://www.okado.app";
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.okado.app";
export const CONTENT_REVIEWED_AT = "2026-10-14";

export function pageMetadata(
  path: string,
  title: string,
  description: string,
): Metadata {
  const url = new URL(path, SITE_URL).href;
  const image = `${SITE_URL}/og-image.png`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Okado",
      locale: "fr_FR",
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: "Okado — jeux par QR code, roue et ticket à gratter pour les commerces",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export const reviewIndependence =
  "La participation et le gain ne dépendent ni du dépôt d’un avis ni de sa note. Aucun avantage n’est offert en échange d’un avis.";

export const siteEntities = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Okado",
      legalName: "BRUNELLE PEROLS INVESTISSEMENT",
      url: SITE_URL,
      email: "contact@okado.app",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Okado",
      url: SITE_URL,
      inLanguage: "fr",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "Okado",
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      publisher: { "@id": `${SITE_URL}/#organization` },
      description:
        "Logiciel de jeux par QR code pour commerces : roue de la fortune, ticket à gratter, affiches, lots et retrait unique.",
    },
  ],
};

export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
