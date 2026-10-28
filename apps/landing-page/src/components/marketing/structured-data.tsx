import { CONTENT_REVIEWED_AT, SITE_URL, safeJsonLd } from "@/lib/site";

type Faq = { question: string; answer: string };

export function PageSchema({
  path,
  name,
  description,
  faqs = [],
  article = false,
  articleType = "Article",
  datePublished,
  dateModified,
  author,
  image,
  breadcrumbs,
}: {
  path: string;
  name: string;
  description?: string;
  faqs?: Faq[];
  article?: boolean;
  articleType?: "Article" | "BlogPosting";
  datePublished?: string;
  dateModified?: string;
  author?: string;
  image?: string;
  breadcrumbs?: { name: string; path: string }[];
}) {
  const url = new URL(path, SITE_URL).href;
  const graph: Record<string, unknown>[] = [
    {
      "@type": article ? articleType : "WebPage",
      "@id": `${url}#page`,
      url,
      name,
      ...(article
        ? {
            headline: name,
            ...(description ? { description } : {}),
            datePublished: datePublished ?? CONTENT_REVIEWED_AT,
            dateModified: dateModified ?? CONTENT_REVIEWED_AT,
            inLanguage: "fr",
            ...(author
              ? { author: { "@type": "Organization", name: author, url: SITE_URL } }
              : { author: { "@id": `${SITE_URL}/#organization` } }),
            publisher: { "@id": `${SITE_URL}/#organization` },
            ...(image ? { image: [image] } : {}),
            mainEntityOfPage: { "@type": "WebPage", "@id": `${url}#page` },
          }
        : {}),
      isPartOf: { "@id": `${SITE_URL}/#website` },
      ...(article ? {} : { about: { "@id": `${SITE_URL}/#software` } }),
    },
  ];
  if (path !== "/")
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Okado",
          item: `${SITE_URL}/`,
        },
        ...(breadcrumbs ?? [{ name, path }]).map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 2,
          name: crumb.name,
          item: new URL(crumb.path, SITE_URL).href,
        })),
      ],
    });
  if (faqs.length)
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqs.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: safeJsonLd({
          "@context": "https://schema.org",
          "@graph": graph,
        }),
      }}
    />
  );
}
