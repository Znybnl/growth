import Link from "next/link";
import { Check } from "lucide-react";
import { LocalizedPrice } from "@/components/marketing/localized-price";
import { PrimaryButton } from "@/components/marketing/primary-button";
import { PageSchema } from "@/components/marketing/structured-data";
import { APP_URL, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata(
  "/tarifs",
  "Tarifs Okado : abonnement et 30 jours d’essai gratuit",
  "Okado Pro : 20 € HT par mois en France, sans engagement. Découvrez les fonctionnalités incluses, les coûts des lots et l’essai de 30 jours sans carte bancaire.",
);
const included = [
  "Roue de la fortune et ticket à gratter",
  "Jeux, scans, participations et contacts illimités",
  "Personnalisation du logo, des textes et des modèles",
  "Affiches A4/A5 et téléchargement du QR code",
  "Configuration des lots, probabilités et stocks",
  "E-mail de gain et retrait unique par QR et PIN",
  "Résultats, export CSV et suivi des retraits",
  "Notifications et synthèses configurables",
  "Portail de facturation et résiliation en autonomie",
];

export default function PricingPage() {
  return (
    <main id="contenu" className="bg-[#fcfbff] px-5 py-14 text-[#0f172b]">
      <PageSchema path="/tarifs" name="Tarifs Okado" />
      <div className="mx-auto max-w-[1000px]">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#6c00f6]">
            Abonnement et essai
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.04em] md:text-6xl">
            Un jeu à votre image.
            <br />
            Une offre lisible.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[#475569]">
            Essayez pendant 30 jours sans carte bancaire. Choisissez vos lots et
            votre budget, puis suivez les participations, les gains et les retraits
            depuis votre espace marchand.
          </p>
        </div>
        <div className="mt-10 grid gap-8 rounded-3xl border border-[#ded4f3] bg-white p-7 md:grid-cols-2 md:p-10">
          <div>
            <h2 className="text-xl font-semibold text-[#6c00f6]">Okado Pro</h2>
            <LocalizedPrice />
            <p className="mt-5 text-sm leading-7 text-[#475569]">
              Abonnement mensuel sans engagement. Les cadeaux et prestations
              sont choisis et financés par votre établissement.
            </p>
            <div className="mt-7">
              <PrimaryButton href={`${APP_URL}/inscription`} trackingName="start_trial" trackingLocation="pricing_page">
                Commencer mon essai gratuit
              </PrimaryButton>
            </div>
          </div>
          <ul className="space-y-4">
            {included.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-6">
                <Check
                  aria-hidden="true"
                  className="mt-1 h-4 w-4 shrink-0 text-[#6c00f6]"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <section className="mt-12 grid gap-7 md:grid-cols-2">
          <article className="rounded-2xl border border-[#e5e7eb] bg-white p-7">
            <h2 className="text-2xl font-semibold">
              Ce qui s’ajoute à l’abonnement
            </h2>
            <p className="mt-4 leading-8 text-[#475569]">
              Vos lots, leurs remises et l’impression de vos supports restent à
              votre charge. Un cadeau valorisé à 10 € n’a pas forcément un coût
              de 10 € pour votre établissement. Précisez vos hypothèses avant de
              comparer le coût de plusieurs jeux.
            </p>
            <Link
              href="/guides/cout-jeu-marketing"
              className="mt-4 inline-block text-sm font-semibold text-[#6c00f6] underline"
            >
              Calculer le coût des dotations
            </Link>
          </article>
          <article className="rounded-2xl border border-[#e5e7eb] bg-white p-7">
            <h2 className="text-2xl font-semibold">Essai et résiliation</h2>
            <p className="mt-4 leading-8 text-[#475569]">
              Vous créez votre compte et testez le service sans carte bancaire.
              À la fin de l’essai, un abonnement est nécessaire pour poursuivre
              l’exploitation des jeux. La résiliation se fait depuis le portail
              de facturation et prend effet en fin de période payée.
            </p>
            <Link
              href="/cgv"
              className="mt-4 inline-block text-sm font-semibold text-[#6c00f6] underline"
            >
              Lire les conditions d’abonnement
            </Link>
          </article>
        </section>
        <aside className="mt-8 rounded-2xl bg-[#f0eafb] p-7">
          <h2 className="text-xl font-semibold">
            Vous gérez plusieurs établissements ?
          </h2>
          <p className="mt-3 leading-7 text-[#475569]">
            Okado dispose de fonctions multi-sites. Pour préciser le périmètre
            de votre compte et les conditions applicables, contactez{" "}
            <a
              href="mailto:contact@okado.app"
              className="font-semibold underline"
            >
              contact@okado.app
            </a>
            .
          </p>
        </aside>
      </div>
    </main>
  );
}
