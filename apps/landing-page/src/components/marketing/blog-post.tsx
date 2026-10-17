import Link from "next/link";
import { PrimaryButton } from "@/components/marketing/primary-button";
import { blogPostByPath, type BlogPost } from "@/lib/blog";
import { APP_URL } from "@/lib/site";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(value));
}
function relatedTitle(path: string) {
  return (
    blogPostByPath(path)?.title ??
    {
      "/comment-ca-marche": "Comment fonctionne un jeu QR code ?",
      "/affiches-qr-code": "Créer une affiche et tester son QR code",
      "/restaurants": "Jeu QR code pour restaurant",
      "/instituts-beaute": "Animation pour institut de beauté",
      "/guides/lots-institut-beaute": "Choisir les lots pour un institut de beauté",
      "/guides/lots-restaurant": "Choisir les lots d’un jeu en restaurant",
      "/guides/cout-jeu-marketing": "Évaluer le coût d’une animation marketing",
      "/guides/placer-qr-code-jeu": "Où placer un QR code de jeu ?",
      "/guides/mesurer-jeu-qr-code": "Lire les bons indicateurs",
      "/tarifs": "Tarifs et essai gratuit",
    }[path] ?? path
  );
}

export function BlogPostTemplate({ post }: { post: BlogPost }) {
  return (
    <main id="contenu" className="bg-[#f7f3ed] px-5 py-10 text-[#111827] md:py-16">
      <div className="mx-auto max-w-[1120px]">
        <nav aria-label="Fil d’Ariane" className="text-sm text-[#667085]">
          <Link href="/" className="underline underline-offset-4">
            Okado
          </Link>
          <span aria-hidden="true" className="mx-2">
            /
          </span>
          <Link href="/blog" className="underline underline-offset-4">
            Blog
          </Link>
          <span aria-hidden="true" className="mx-2">
            /
          </span>
          {post.eyebrow}
        </nav>

        <header className="relative mt-8 overflow-hidden rounded-[28px] bg-[#132238] px-6 py-10 text-white shadow-[0_24px_70px_rgba(19,34,56,0.18)] md:px-12 md:py-14">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[34px] border-[#ffb36b]/70" />
          <div className="pointer-events-none absolute bottom-[-100px] left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[#6c00f6]/70 blur-3xl" />
          <div className="relative max-w-[860px]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffcf9c]">
              {post.eyebrow} · Article de blog
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.06] tracking-[-0.045em] md:text-6xl">
              {post.title}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#d9e3f0] md:text-xl">
              {post.intro}
            </p>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#b9c7d9]">
              <span>Par {post.author}</span>
              <span>
                Publié le <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              </span>
              <span>{post.readingTime}</span>
            </div>
          </div>
        </header>

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-[#e4ddd3] bg-[#fffdf9] p-5 lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#6c00f6]">
              Dans cet article
            </p>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-[#667085]">
              {post.sections.map((section, index) => (
                <li key={section.title}>
                  <a href={`#section-${index + 1}`} className="hover:text-[#6c00f6] hover:underline">
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </aside>

          <article className="min-w-0 rounded-[28px] border border-[#e4ddd3] bg-[#fffdf9] p-6 md:p-11">
            {post.sections.map((section, index) => (
              <section
                key={section.title}
                id={`section-${index + 1}`}
                className="scroll-mt-36 border-b border-[#e4ddd3] py-8 first:pt-0 last:border-0"
              >
                <h2 className="text-2xl font-semibold leading-snug tracking-[-0.03em] md:text-3xl">
                  {section.title}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-5 text-base leading-8 text-[#4b5563]">
                    {paragraph}
                  </p>
                ))}
                {section.items ? (
                  <ol className="mt-6 grid gap-3 pl-5 text-base leading-7 text-[#4b5563] marker:font-semibold marker:text-[#6c00f6]">
                    {section.items.map((item) => (
                      <li key={item} className="pl-2">
                        {item}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </section>
            ))}
            {post.source ? (
              <aside className="mt-8 rounded-2xl bg-[#f2ecff] p-5 text-sm leading-7 text-[#4b5563]">
                <h2 className="font-semibold text-[#111827]">Pour aller plus loin</h2>
                <ul className="mt-2 space-y-1">
                  {post.source.map((source) => (
                    <li key={source.href}>
                      <a href={source.href} className="text-[#6c00f6] underline underline-offset-4">
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}
          </article>
        </div>

        <aside className="mt-10 rounded-[28px] border border-[#ead7c0] bg-[#fff7e8] p-7 md:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a45b17]">
            À retenir
          </p>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
            Une animation utile est simple à comprendre, à délivrer et à mesurer.
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-[#5f5144]">
            Découvrez comment Okado relie un support en point de vente, un jeu mobile et le suivi des gains.
          </p>
          <div className="mt-6">
            <PrimaryButton
              href={post.ctaHref ?? `${APP_URL}/inscription`}
              trackingName="start_trial"
              trackingLocation="blog_article"
            >
              {post.ctaLabel ?? "Essayer Okado"}
            </PrimaryButton>
          </div>
        </aside>

        <section aria-labelledby="related-heading" className="mt-12">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#6c00f6]">Continuer la lecture</p>
          <h2 id="related-heading" className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
            Des ressources pour passer à l’action
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {post.related.map((path) => (
              <li key={path} className="rounded-2xl border border-[#e4ddd3] bg-[#fffdf9] p-5">
                <Link href={path} className="font-semibold leading-6 text-[#6c00f6] hover:underline">
                  {relatedTitle(path)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

