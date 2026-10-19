import Link from "next/link";
import Image from "next/image";
import { PageSchema } from "@/components/marketing/structured-data";
import { blogPosts } from "@/lib/blog";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata(
  "/blog",
  "Blog marketing local et animations commerciales | Okado",
  "Idées et méthodes pour attirer des clients, animer un point de vente et préparer des campagnes locales avec une expérience simple.",
);

export default function BlogPage() {
  const [featured, ...rest] = blogPosts;

  return (
    <main id="contenu" className="bg-[#f7f3ed] px-5 py-12 text-[#111827] md:py-16">
      <PageSchema path="/blog" name="Blog Okado" />
      <div className="mx-auto max-w-[1120px]">
        <header className="max-w-[820px]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6c00f6]">Le blog Okado</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.06] tracking-[-0.045em] md:text-6xl">
            Des idées concrètes pour faire vivre votre commerce.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#667085]">
            Animations commerciales, marketing local et expérience client : des articles pour trouver une idée, l’adapter à votre terrain et mesurer ce qui s’est réellement passé.
          </p>
        </header>

        {featured ? (
          <article className="relative mt-12 overflow-hidden rounded-[28px] bg-[#132238] p-7 text-white shadow-[0_24px_70px_rgba(19,34,56,0.16)] md:p-11">
            <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full border-[32px] border-[#ffb36b]/70" />
            {featured.image ? (
              <div className="relative mb-8 aspect-[2/1] overflow-hidden rounded-[22px] bg-[#f3e9da]">
                <Image
                  src={featured.image}
                  alt={featured.imageAlt ?? featured.title}
                  fill
                  priority
                  sizes="(max-width: 1120px) 100vw, 1060px"
                  className="object-contain"
                />
              </div>
            ) : null}
            <div className="relative max-w-[760px]">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffcf9c]">À la une · {featured.eyebrow}</p>
              <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.04em] md:text-5xl">
                <Link href={featured.path} className="hover:text-[#ffcf9c]">
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[#d9e3f0]">{featured.description}</p>
              <div className="mt-7 flex flex-wrap items-center gap-4 text-sm text-[#b9c7d9]">
                <span>{featured.readingTime}</span>
                <Link href={featured.path} className="font-semibold text-white underline underline-offset-4 hover:text-[#ffcf9c]">
                  Lire l’article
                </Link>
              </div>
            </div>
          </article>
        ) : null}

        {rest.length ? (
          <section aria-labelledby="all-posts" className="mt-14">
            <h2 id="all-posts" className="text-2xl font-semibold">Tous les articles</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {rest.map((post) => (
                <article key={post.path} className="rounded-2xl border border-[#e4ddd3] bg-[#fffdf9] p-7">
                  {post.image ? (
                    <div className="relative aspect-[2/1] overflow-hidden rounded-xl bg-[#f3e9da]">
                      <Image
                        src={post.image}
                        alt={post.imageAlt ?? post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-contain"
                      />
                    </div>
                  ) : null}
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#6c00f6]">{post.eyebrow}</p>
                  <h3 className="mt-4 text-2xl font-semibold leading-snug">
                    <Link href={post.path} className="hover:text-[#6c00f6]">{post.title}</Link>
                  </h3>
                  <p className="mt-4 leading-7 text-[#667085]">{post.description}</p>
                  <Link href={post.path} className="mt-5 inline-block text-sm font-semibold text-[#6c00f6] underline underline-offset-4">
                    Lire l’article
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
