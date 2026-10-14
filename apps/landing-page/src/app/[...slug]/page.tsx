import Link from "next/link";
import { notFound } from "next/navigation";
import { PageSchema } from "@/components/marketing/structured-data";
import { PrimaryButton } from "@/components/marketing/primary-button";
import { TemplateGallery } from "@/components/marketing/template-gallery";
import { contentByPath, publicContent } from "@/lib/public-content";
import { APP_URL, CONTENT_REVIEWED_AT, pageMetadata } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return publicContent.map((page) => ({ slug: page.path.slice(1).split("/") }));
}

type Props = { params: Promise<{ slug: string[] }> };
export async function generateMetadata({ params }: Props) {
  const page = contentByPath(`/${(await params).slug.join("/")}`);
  if (!page) notFound();
  return pageMetadata(page.path, `${page.title} | Okado`, page.description);
}

export default async function ContentPage({ params }: Props) {
  const page = contentByPath(`/${(await params).slug.join("/")}`);
  if (!page) notFound();
  return (
    <main
      id="contenu"
      className="bg-[#fcfbff] px-5 py-10 text-[#0f172b] md:py-16"
    >
      <PageSchema
        path={page.path}
        name={page.title}
        article={page.path.startsWith("/guides/")}
      />
      <div className="mx-auto max-w-[1100px]">
        <nav aria-label="Fil d’Ariane" className="text-sm text-[#64748b]">
          <Link href="/" className="underline underline-offset-4">
            Okado
          </Link>
          <span aria-hidden="true" className="mx-2">
            /
          </span>
          {page.eyebrow}
        </nav>
        <header className="mb-12 mt-8 max-w-[850px]">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#6c00f6]">
            {page.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-[-0.04em] md:text-[54px]">
            {page.title}
          </h1>
          <p className="mt-6 text-lg leading-8 text-[#475569]">{page.intro}</p>
          <p className="mt-5 text-xs text-[#64748b]">
            Par l’équipe Okado · Vérifié le{" "}
            <time dateTime={CONTENT_REVIEWED_AT}>14 octobre 2026</time>
          </p>
        </header>
        <div className="grid items-start gap-10 lg:grid-cols-[230px_minmax(0,1fr)]">
          <details
            open
            className="rounded-2xl border border-[#e5e7eb] bg-white p-5 lg:sticky lg:top-28"
          >
            <summary className="cursor-pointer font-semibold">
              Dans cette page
            </summary>
            <nav aria-label="Sommaire">
              <ol className="mt-4 space-y-3 text-sm leading-6 text-[#475569]">
                {page.sections.map((section, index) => (
                  <li key={section.title}>
                    <a
                      href={`#section-${index + 1}`}
                      className="hover:text-[#6c00f6] hover:underline"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </details>
          <article className="min-w-0 rounded-3xl border border-[#e5e7eb] bg-white p-6 md:p-10">
            {page.sections.map((section, index) => (
              <section
                key={section.title}
                id={`section-${index + 1}`}
                className="scroll-mt-36 border-b border-[#e5e7eb] py-7 first:pt-0 last:border-0"
              >
                <h2 className="text-2xl font-semibold leading-snug tracking-[-0.025em]">
                  {section.title}
                </h2>
                {section.paragraphs.map((p) => (
                  <p
                    key={p}
                    className="mt-4 text-base leading-8 text-[#475569]"
                  >
                    {p}
                  </p>
                ))}
                {section.items && (
                  <ul className="mt-4 list-disc space-y-3 pl-5 text-base leading-7 text-[#475569]">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            {page.source && (
              <aside className="mt-7 rounded-xl bg-[#f8f6fe] p-5 text-sm leading-7">
                <h2 className="font-semibold">Sources utiles</h2>
                <ul>
                  {page.source.map((source) => (
                    <li key={source.href}>
                      <a
                        href={source.href}
                        className="text-[#6c00f6] underline underline-offset-4"
                      >
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </article>
        </div>
        {page.path === "/ticket-a-gratter" ? <TemplateGallery /> : null}
        <aside className="mt-12 rounded-3xl border border-[#ded4f3] bg-white p-7">
          <h2 className="text-2xl font-semibold">Pour aller plus loin</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {page.related.map((path) => (
              <li key={path}>
                <Link
                  href={path}
                  className="text-sm font-semibold text-[#6c00f6] underline underline-offset-4"
                >
                  {contentByPath(path)?.title ??
                    {
                      "/instituts-beaute": "Okado pour les instituts de beauté",
                      "/restaurants": "Okado pour les restaurants",
                      "/tarifs": "Tarifs et essai gratuit",
                      "/cgv": "CGV et DPA",
                    }[path] ??
                    path}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
        <div className="mt-10 flex flex-col items-start gap-5 rounded-3xl bg-[#f0eafb] p-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg font-semibold">
            Découvrez le parcours avec votre propre jeu.
            <span className="mt-2 block text-sm font-normal text-[#475569]">
              30 jours d’essai, sans carte bancaire.
            </span>
          </p>
          <PrimaryButton href={`${APP_URL}/inscription`}>
            Essayer Okado
          </PrimaryButton>
        </div>
      </div>
    </main>
  );
}
