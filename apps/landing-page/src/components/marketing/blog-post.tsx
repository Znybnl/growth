import Link from "next/link";
import Image from "next/image";
import { BlogInlineText } from "@/components/marketing/blog-inline-text";
import { PrimaryButton } from "@/components/marketing/primary-button";
import { blogPostByPath, type BlogPost } from "@/lib/blog";
import { APP_URL } from "@/lib/site";
import styles from "./blog-post.module.css";

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
  const ctaHref = post.ctaHref ?? `${APP_URL}/inscription`;
  const practical = Boolean(post.guide);
  const contents = (
    <ol className="mt-4 space-y-3 text-sm leading-6 text-[#667085]">
      {post.sections.map((section, index) => (
        <li key={section.title}>
          <a href={`#${section.id ?? `section-${index + 1}`}`} className="hover:text-[#6c00f6] hover:underline">
            {section.title}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <main id="contenu" className={practical ? "bg-[#f7f3ed] px-5 py-8 text-[#111827] md:py-10" : "bg-[#f7f3ed] px-5 py-10 text-[#111827] md:py-16"}>
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
          <span aria-current="page">{post.title}</span>
        </nav>

        {post.image && !practical ? (
          <figure className="relative mt-8 aspect-[2/1] overflow-hidden rounded-[28px] border border-[#e4ddd3] bg-[#f3e9da] shadow-[0_18px_50px_rgba(19,34,56,0.12)]">
            <Image
              src={post.image}
              alt={post.imageAlt ?? post.title}
              fill
              priority
              sizes="(max-width: 1120px) 100vw, 1120px"
              className="object-contain"
            />
          </figure>
        ) : null}

        <header className={practical ? "mt-7 border-b border-[#d8d0c5] pb-7" : "relative mt-6 overflow-hidden rounded-[28px] bg-[#132238] px-6 py-10 text-white shadow-[0_24px_70px_rgba(19,34,56,0.18)] md:px-12 md:py-14"}>
          {!practical ? <>
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[34px] border-[#ffb36b]/70" />
            <div className="pointer-events-none absolute bottom-[-100px] left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[#6c00f6]/70 blur-3xl" />
          </> : null}
          <div className={practical ? "max-w-[960px]" : "relative max-w-[860px]"}>
            <p className={practical ? "text-xs font-bold uppercase tracking-[0.15em] text-[#6c00f6]" : "text-xs font-bold uppercase tracking-[0.18em] text-[#ffcf9c]"}>
              {post.eyebrow} · Article de blog
            </p>
            <h1 className={practical ? "mt-3 text-3xl font-semibold leading-[1.12] tracking-[-0.035em] md:text-5xl" : "mt-5 text-4xl font-semibold leading-[1.06] tracking-[-0.045em] md:text-6xl"}>
              {post.title}
            </h1>
            <p className={practical ? "mt-4 max-w-3xl text-base leading-7 text-[#4b5563] md:text-lg" : "mt-6 max-w-3xl text-lg leading-8 text-[#d9e3f0] md:text-xl"}>
              {post.intro}
            </p>
            <div className={practical ? "mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#667085]" : "mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#b9c7d9]"}>
              <span>Par {post.author}</span>
              {!practical ? <span>
                Publié le <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              </span> : null}
              <span>
                Mis à jour le <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
              </span>
              {!practical ? <span>
                Relu le <time dateTime={post.reviewedAt}>{formatDate(post.reviewedAt)}</time>
              </span> : null}
              <span>{post.readingTime}</span>
            </div>
            <p className={practical ? "mt-3 max-w-3xl text-sm leading-6 text-[#667085]" : "mt-4 max-w-3xl text-sm leading-6 text-[#b9c7d9]"}>
              {practical ? "Guide préparé avec une assistance IA. Les exemples fictifs ne sont pas des résultats clients." : "Guide préparé avec une assistance IA et publié par Okado, éditeur de jeux par QR code. Les cas signalés comme fictifs sont des simulations, pas des résultats clients."}
            </p>
          </div>
        </header>

        {post.guide ? (
          <nav aria-label="Choisir votre situation" className="mt-6">
            <p className="text-sm font-semibold text-[#30264a]">Par où commencer ?</p>
            <ul className="mt-3 grid gap-3 md:grid-cols-3">
              {post.guide.map((entry, index) => (
                <li key={entry.sectionId}>
                  <a href={`#${entry.sectionId}`} className="group block h-full rounded-xl border border-[#d8d0c5] bg-[#fffdf9] p-4 transition-colors hover:border-[#6c00f6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6c00f6]">
                    <span className="text-xs font-semibold text-[#6c00f6]">0{index + 1}</span>
                    <span className="mt-1 block font-semibold leading-6 text-[#30264a] group-hover:underline">{entry.label} <span aria-hidden="true">↗</span></span>
                    <span className="mt-2 block text-sm leading-6 text-[#4b5563]">{entry.description}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {post.answer ? (
          <aside className="mt-8 rounded-2xl border border-[#d9c8f4] bg-[#f2ecff] p-6" aria-label="Réponse courte">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#6c00f6]">Réponse courte</p>
            <p className="mt-3 text-lg leading-8 text-[#30264a]">{post.answer}</p>
          </aside>
        ) : null}

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          {practical ? (
            <details className="rounded-xl border border-[#e4ddd3] bg-[#fffdf9] p-5 lg:hidden" aria-label="Sommaire du guide">
              <summary className="cursor-pointer font-semibold text-[#30264a]">Sommaire des étapes</summary>
              {contents}
            </details>
          ) : null}
          <aside className={practical ? "hidden rounded-2xl border border-[#e4ddd3] bg-[#fffdf9] p-5 lg:sticky lg:top-28 lg:block lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto" : "rounded-2xl border border-[#e4ddd3] bg-[#fffdf9] p-5 lg:sticky lg:top-28"}>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#6c00f6]">
              Dans cet article
            </p>
            {contents}
          </aside>

          <article className="min-w-0 rounded-[28px] border border-[#e4ddd3] bg-[#fffdf9] p-6 md:p-11">
            {post.sections.map((section, index) => (
              <section
                key={section.title}
                id={section.id ?? `section-${index + 1}`}
                className="scroll-mt-36 border-b border-[#e4ddd3] py-8 first:pt-0 last:border-0"
              >
                <h2 className="text-2xl font-semibold leading-snug tracking-[-0.03em] md:text-3xl">
                  {section.title}
                </h2>
                {section.optional ? (
                  <details className="mt-5 rounded-xl border border-[#e4ddd3] p-4">
                    <summary className="cursor-pointer font-semibold text-[#30264a]">Afficher l’exemple de suivi facultatif</summary>
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="mt-5 break-words text-base leading-8 text-[#4b5563]">
                        <BlogInlineText text={paragraph} />
                      </p>
                    ))}
                  </details>
                ) : section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-5 text-base leading-8 text-[#4b5563]">
                    <BlogInlineText text={paragraph} />
                  </p>
                ))}
                {section.items ? (
                  <ol className={practical ? "mt-6 grid list-decimal gap-3 pl-5 text-base leading-7 text-[#4b5563] marker:font-semibold marker:text-[#6c00f6]" : "mt-6 grid gap-3 pl-5 text-base leading-7 text-[#4b5563] marker:font-semibold marker:text-[#6c00f6]"}>
                    {section.items.map((item) => (
                      <li key={item} className="pl-2">
                        <BlogInlineText text={item} />
                      </li>
                    ))}
                  </ol>
                ) : null}
                {section.result ? (
                  <p className="mt-5 border-l-2 border-[#6c00f6] pl-4 text-base leading-7 text-[#30264a]">
                    <strong>À vérifier : </strong><BlogInlineText text={section.result} />
                  </p>
                ) : null}
                {section.fallback ? (
                  <p className="mt-3 text-sm leading-7 text-[#4b5563]">
                    <strong>Si vous êtes bloqué : </strong><BlogInlineText text={section.fallback} />
                  </p>
                ) : null}
                {section.checklist ? (
                  <ul className="mt-6 divide-y divide-[#e4ddd3]">
                    {section.checklist.map((item) => (
                      <li key={item}>
                        <label className="flex cursor-pointer items-start gap-3 py-4 text-base leading-7 text-[#4b5563]">
                          <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[#6c00f6] focus-visible:outline-2 focus-visible:outline-offset-4" />
                          <span>{item}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {section.table ? (
                  <div
                    className="mt-6 overflow-x-auto rounded-xl border border-[#e4ddd3] focus-visible:outline-2 focus-visible:outline-offset-4"
                    role="region"
                    aria-label={section.table.caption}
                    tabIndex={0}
                  >
                    <table role="table" className={`w-full text-left text-sm leading-6 text-[#4b5563]${practical ? ` ${styles.guideTable}` : ""}`}>
                      <caption className="px-4 py-3 text-left font-semibold text-[#111827]">
                        {section.table.caption}
                      </caption>
                      <thead className="bg-[#f2ecff] text-[#30264a]">
                        <tr>{section.table.headers.map((header) => (
                          <th key={header} scope="col" className="min-w-32 px-4 py-3">{header}</th>
                        ))}</tr>
                      </thead>
                      <tbody>{section.table.rows.map((row) => (
                        <tr key={row[0]} className="border-t border-[#e4ddd3]">
                          {row.map((cell, cellIndex) => cellIndex === 0 ? (
                            <th key={cellIndex} scope="row" className="px-4 py-3 font-semibold">
                              <BlogInlineText text={cell} />
                            </th>
                          ) : (
                            <td key={cellIndex} className="px-4 py-3 align-top">
                              {practical ? <span aria-hidden="true" className={styles.mobileLabel}>{section.table!.headers[cellIndex]}</span> : null}
                              <BlogInlineText text={cell} />
                            </td>
                          ))}
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : null}
                {section.figures?.map((figure) => (
                  <figure key={figure.src} className="mt-7 rounded-2xl border border-[#e4ddd3] bg-white p-4 sm:p-5">
                    <a
                      href={figure.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Agrandir la capture : ${figure.alt}`}
                      className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6c00f6]"
                    >
                      <Image
                        src={figure.src}
                        width={figure.width}
                        height={figure.height}
                        alt={figure.alt}
                        sizes="(max-width: 640px) 80vw, 549px"
                        className="mx-auto h-auto w-full max-w-[549px] rounded-xl"
                      />
                    </a>
                    <figcaption className="mt-4 text-sm leading-6 text-[#4b5563]">
                      <BlogInlineText text={figure.caption} />
                      <span className="mt-2 block">
                        <a href={figure.sourceUrl} className="text-[#6c00f6] underline underline-offset-4">Interface Google Business Profile</a>
                        {" · Capture du "}<time dateTime={figure.capturedAt}>{formatDate(figure.capturedAt)}</time>
                        {" · Sélectionnez l’image pour l’agrandir."}
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </section>
            ))}
            {post.source ? (
              <aside className="mt-8 rounded-2xl bg-[#f2ecff] p-5 text-sm leading-7 text-[#4b5563]">
                <h2 className="font-semibold text-[#111827]">Sources et références</h2>
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
            {post.takeaway.title}
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-[#5f5144]">
            <BlogInlineText text={post.takeaway.text} />
          </p>
          <div className="mt-6">
            <PrimaryButton
              href={ctaHref}
              trackingName={ctaHref === `${APP_URL}/inscription` ? "start_trial" : "explore_product"}
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

