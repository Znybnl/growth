import { CONTENT_REVIEWED_AT, SITE_URL, safeJsonLd } from "@/lib/site";

type Faq = { question: string; answer: string };

export function PageSchema({
  path,
  name,
  faqs = [],
  article = false,
}: {
  path: string;
  name: string;
  faqs?: Faq[];
  article?: boolean;
}) {
  const url = new URL(path, SITE_URL).href;
  const graph: Record<string, unknown>[] = [
    {
      "@type": article ? "Article" : "WebPage",
      "@id": `${url}#page`,
      url,
      name,
      ...(article
        ? {
            headline: name,
            dateModified: CONTENT_REVIEWED_AT,
            inLanguage: "fr",
            author: { "@id": `${SITE_URL}/#organization` },
            publisher: { "@id": `${SITE_URL}/#organization` },
          }
        : {}),
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#software` },
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
        { "@type": "ListItem", position: 2, name, item: url },
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
