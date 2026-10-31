import Link from "next/link";
import { BrandMark } from "@/components/marketing/brand-mark";
import { PrimaryButton } from "@/components/marketing/primary-button";
import { APP_URL } from "@/lib/site";
import { MobileNavigation } from "./mobile-navigation";

const navigation = [
  { href: "/comment-ca-marche", label: "Fonctionnement" },
  { href: "/#modeles", label: "Modèles" },
  { href: "/#cas-usage", label: "Secteurs" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/blog", label: "Blog" },
];

export function SiteHeader() {
  return (
    <>
      <a
        href="#contenu"
        className="sr-only z-50 rounded-lg bg-white p-3 text-[#0f172b] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller au contenu
      </a>
      <div className="hidden bg-[#6c00f6] px-4 py-2 text-center text-xs font-medium text-white sm:block sm:text-sm">
        30 jours d’essai gratuit, sans carte bancaire.
      </div>
      <header className="sticky top-0 z-30 border-b border-[#e5e7eb] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between gap-2 px-4 md:px-5">
          <BrandMark subtitle="jeux par QR code" />
          <nav
            aria-label="Navigation principale"
            className="hidden items-center gap-5 text-sm font-semibold text-[#0f172b] lg:flex"
          >
            {navigation.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-[#6c00f6]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-4 [&>a:last-of-type]:px-3 [&>a:last-of-type]:text-xs sm:[&>a:last-of-type]:px-5 sm:[&>a:last-of-type]:text-[15px]">
            <Link
              href={`${APP_URL}/connexion`}
              className="hidden text-sm font-semibold text-[#475569] md:inline-flex"
            >
              Connexion
            </Link>
            <PrimaryButton href={`${APP_URL}/inscription`} trackingName="start_trial" trackingLocation="header">
              Essai gratuit
            </PrimaryButton>
            <MobileNavigation links={navigation} />
          </div>
        </div>
      </header>
    </>
  );
}

const footerGroups = [
  {
    label: "Découvrir",
    links: [
      ["Comment ça marche", "/comment-ca-marche"],
      ["Roue de la fortune", "/roue-de-la-fortune"],
      ["Modèles de jeux", "/#modeles"],
      ["Ticket à gratter", "/ticket-a-gratter"],
      ["Affiches et QR code", "/affiches-qr-code"],
      ["Tarifs", "/tarifs"],
    ],
  },
  {
    label: "Votre activité",
    links: [
      ["Instituts de beauté", "/instituts-beaute"],
      ["Restaurants", "/restaurants"],
      ["Guides pratiques", "/guides"],
      ["Blog marketing", "/blog"],
      ["À propos et contact", "/a-propos"],
    ],
  },
  {
    label: "Informations",
    links: [
      ["Sécurité et données", "/securite-et-donnees"],
      ["Confidentialité", "/confidentialite"],
      ["CGV et DPA", "/cgv"],
      ["Règlement des jeux", "/campaign/reglement"],
      ["Connexion", `${APP_URL}/connexion`],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[#e5e7eb] bg-white px-5 py-12 text-[#475569]">
      <div className="mx-auto grid max-w-[1200px] gap-8 md:grid-cols-4">
        <div>
          <BrandMark subtitle="jeux par QR code" />
          <p className="mt-5 text-sm leading-7">
            Créez un jeu mobile, affichez son QR code et suivez les
            participations, les gains et les retraits.
          </p>
          <a
            className="mt-4 inline-block text-sm underline underline-offset-4"
            href="mailto:contact@okado.app"
          >
            contact@okado.app
          </a>
        </div>
        {footerGroups.map((group) => (
          <nav key={group.label} aria-label={group.label}>
            <p className="font-semibold text-[#0f172b]">{group.label}</p>
            <ul className="mt-4 space-y-3 text-sm">
              {group.links.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="hover:text-[#6c00f6] hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-[1200px] border-t border-[#e5e7eb] pt-6 text-xs leading-6">
        © {new Date().getFullYear()} Okado. Édité par BRUNELLE PEROLS
        INVESTISSEMENT, SAS au capital de 40 000 €, SIRET 99177964600017, RCS
        Versailles 991 779 646. Dammartin-en-Serve, France.
      </p>
    </footer>
  );
}

export function PricingReminder() {
  return (
    <aside
      aria-label="Abonnement et essai"
      className="mx-auto my-8 flex max-w-[1100px] flex-col justify-between gap-4 rounded-2xl border border-[#ded4f3] bg-white px-6 py-5 text-sm text-[#475569] sm:flex-row sm:items-center"
    >
      <p>
        <strong className="text-[#0f172b]">
          20 € HT / mois · 30 jours d’essai sans carte.
        </strong>
        <span className="mt-1 block">
          Sans engagement. Les lots sont choisis et financés par votre
          établissement.
        </span>
      </p>
      <Link
        href="/tarifs"
        className="shrink-0 font-semibold text-[#6c00f6] underline underline-offset-4"
      >
        Voir les tarifs et ce qui est inclus
      </Link>
    </aside>
  );
}
