import Link from "next/link";
import { publicContent } from "@/lib/public-content";
import { pageMetadata } from "@/lib/site";
import { PageSchema } from "@/components/marketing/structured-data";

export const metadata = pageMetadata(
  "/guides",
  "Guides de jeux QR code : lots, budget et mesure | Okado",
  "Des guides pratiques pour choisir vos lots, préparer votre affiche et lire les résultats d’un jeu en établissement sans confondre scans, gains et retraits.",
);

export default function GuidesPage() {
  const guides = publicContent.filter((page) =>
    /^\/(guides|aide)\//.test(page.path),
  );
  return (
    <main id="contenu" className="bg-[#fcfbff] px-5 py-14 text-[#0f172b]">
      <PageSchema path="/guides" name="Guides pratiques" />
      <div className="mx-auto max-w-[1100px]">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#6c00f6]">
          Ressources Okado
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-[-0.04em] md:text-6xl">
          Des repères concrets pour votre prochain jeu.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#475569]">
          Lots, coûts, supports, données et résultats : préparez votre animation
          à partir de méthodes explicites, pas de promesses de rentabilité
          automatique.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {guides.map((guide) => (
            <article
              key={guide.path}
              className="rounded-2xl border border-[#e5e7eb] bg-white p-7"
            >
              <p className="text-xs font-semibold uppercase text-[#6c00f6]">
                {guide.eyebrow}
              </p>
              <h2 className="mt-4 text-2xl font-semibold leading-snug">
                <Link href={guide.path} className="hover:text-[#6c00f6]">
                  {guide.title}
                </Link>
              </h2>
              <p className="mt-4 leading-7 text-[#475569]">
                {guide.description}
              </p>
              <Link
                href={guide.path}
                className="mt-5 inline-block text-sm font-semibold text-[#6c00f6] underline underline-offset-4"
              >
                Lire le guide
              </Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
