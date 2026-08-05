import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Car,
  Check,
  ChevronDown,
  Download,
  Gift,
  Mail,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Trophy,
  Utensils,
  type LucideIcon,
} from "lucide-react";

import { LandingDemo, LocalizedPrice } from "@/components/marketing/landing-demo";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.okado.app";

export const metadata: Metadata = {
  title: "Okado | Digitalisez le trafic de votre point de vente",
  description:
    "Transformez vos visiteurs physiques anonymes en prospects qualifiés grâce à des jeux concours par QR Code. Capture de leads, avis Google, affiches A4 et retrait sécurisé en boutique.",
  keywords: [
    "SaaS B2B",
    "fidélisation client",
    "jeux concours magasin",
    "QR Code marketing",
    "avis Google",
    "génération de leads physiques",
    "phygital",
    "restaurant",
    "commerce local",
    "concession automobile",
  ],
  alternates: {
    canonical: "https://okado.app",
  },
  openGraph: {
    title: "Okado | Digitalisez le trafic de votre point de vente",
    description:
      "Créez des jeux concours sur QR Code, capturez des prospects locaux et animez votre point de vente en quelques minutes.",
    url: "https://okado.app",
    siteName: "Okado",
    images: [
      {
        url: "https://okado.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Interface Okado avec roue de la fortune et affiche QR Code",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
};

const features = [
  {
    icon: ScanLine,
    title: "Scan instantané",
    text: "Vos clients scannent un QR Code sur une affiche, un comptoir ou une table. Aucun téléchargement, aucun compte à créer, juste une page mobile rapide et claire.",
  },
  {
    icon: Mail,
    title: "Capture de données qualifiées",
    text: "Avant de recevoir son lot, le visiteur laisse son prénom et son e-mail. Vous construisez une base locale exploitable pour relancer vos clients et mesurer votre trafic physique.",
  },
  {
    icon: Star,
    title: "Avis Google intelligents",
    text: "Ajoutez une action marketing avant le jeu : avis Google, Instagram, Facebook, TikTok, Tripadvisor ou collecte e-mail. Chaque participation peut avoir son objectif.",
  },
  {
    icon: Download,
    title: "Affiches prêtes à imprimer",
    text: "Générez une affiche A4 avec QR Code, logo, couleurs et visuel de jeu. Vous pouvez aussi télécharger le QR Code seul pour l’intégrer dans Canva.",
  },
];

const useCases = [
  {
    icon: Utensils,
    label: "Restauration",
    title: "Animez vos tables, files d’attente et passages au comptoir.",
    text: "Le client joue pendant l’attente et tente de gagner un café, une remise ou un cadeau valable lors de sa prochaine visite.",
    href: "/restaurants",
    cta: "Voir la page dédiée aux restaurants",
  },
  {
    icon: Sparkles,
    label: "Instituts de beauté",
    title: "Transformez chaque rendez-vous en fidélisation locale.",
    text: "Déclenchez des avis Google, collectez des contacts et créez une raison simple de revenir pour une prochaine prestation.",
    href: "/instituts-beaute",
    cta: "Voir la page dédiée aux instituts",
  },
  {
    icon: Store,
    label: "Commerces",
    title: "Transformez le passage en boutique en relation client durable.",
    text: "Collectez des contacts qualifiés, stimulez vos avis Google et créez une raison simple de revenir en magasin.",
  },
  {
    icon: Car,
    label: "Concessions automobiles",
    title: "Capturez le trafic fantôme de vos journées portes ouvertes.",
    text: "Lors des pics d’affluence, tous les visiteurs ne parlent pas à un vendeur. Okado transforme ces passages anonymes en leads activables.",
  },
  {
    icon: Building2,
    label: "Evènementiel et association",
    title: "Animez vos événements sans complexité opérationnelle.",
    text: "Salons, clubs, associations, opérations locales : déployez un jeu lisible, mobile et mesurable en quelques minutes.",
  },
];

const included = [
  "Campagnes illimitées : roue, ticket à gratter et actions marketing",
  "Scans, participations et leads illimités",
  "Module d’avis Google et liens sociaux",
  "Générateur d’affiches A4 et téléchargement du QR Code",
  "Export CSV des prospects et suivi des lots retirés",
  "Portail de facturation et résiliation en autonomie",
];

const faqs = [
  {
    question: "Comment fonctionne l’essai gratuit de 30 jours ?",
    answer:
      "Vous créez votre compte, configurez votre premier jeu et imprimez votre affiche sans carte bancaire. À la fin de l’essai, vos campagnes peuvent être réactivées avec l’abonnement mensuel.",
  },
  {
    question: "Comment éviter qu’un lot soit récupéré plusieurs fois ?",
    answer:
      "Lorsqu’un client gagne, un QR Code de retrait unique est généré et envoyé par e-mail. Le vendeur le scanne au moment de la remise du lot, ce qui verrouille définitivement le coupon.",
  },
  {
    question: "Est-ce compatible avec le RGPD ?",
    answer:
      "Oui. Le parcours intègre le consentement marketing et vous gardez la maîtrise de vos données. Les exports servent à vos campagnes locales et doivent être utilisés selon vos obligations légales.",
  },
  {
    question: "Puis-je utiliser mes propres affiches Canva ?",
    answer:
      "Oui. Vous pouvez générer une affiche automatiquement dans Okado ou télécharger uniquement le QR Code pour l’ajouter dans vos créations existantes.",
  },
];

const trustSegments: Array<{ label: string; icon: LucideIcon }> = [
  { label: "Restauration", icon: Utensils },
  { label: "Boutiques de quartier", icon: Store },
  { label: "Concessions automobiles", icon: Car },
  { label: "Salons & instituts", icon: Sparkles },
];

const secureSteps: Array<{ title: string; icon: LucideIcon; text: string }> = [
  {
    title: "QR unique",
    icon: QrCode,
    text: "Chaque gain dispose d’un code de retrait individuel.",
  },
  {
    title: "E-mail automatique",
    icon: Mail,
    text: "Le client garde son coupon même s’il quitte la page.",
  },
  {
    title: "Validation vendeur",
    icon: BadgeCheck,
    text: "Le personnel confirme la remise du lot en boutique.",
  },
  {
    title: "Stock sécurisé",
    icon: ShieldCheck,
    text: "Les quantités limitées sont réservées et suivies.",
  },
];

function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Retour à l'accueil Okado">
      <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-[#6c00f6] text-sm font-bold text-white shadow-[0_0_24px_rgba(108,0,246,0.20)]">
        <Star className="h-5 w-5 fill-white text-white" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-[-0.03em] text-[#0f172b]">Okado</span>
        <span className="mt-1 text-[11px] font-medium text-[#90a1b9]">
          activation phygitale
        </span>
      </span>
    </Link>
  );
}

function PurpleButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[linear-gradient(to_right,#6c00f6_0%,#4f46e5_100%)] px-5 py-3 text-[15px] font-semibold !text-white shadow-[0_0_24px_rgba(108,0,246,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(108,0,246,0.26)]"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function GhostLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#0f172b] transition hover:text-[#6c00f6]"
    >
      {children}
      <span className="text-[#6c00f6]">→</span>
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <span className="rounded-[4px] bg-[#7f22fe]/10 px-2 py-1.5 text-xs font-medium text-[#7f22fe]">
        {eyebrow}
      </span>
      <h2 className="mt-5 text-3xl font-bold leading-[1.15] tracking-[-0.04em] text-[#0f172b] md:text-[42px]">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-[#475569]">{text}</p>
    </div>
  );
}

export default function IndexPage() {
  return (
    <main className="min-h-screen bg-white font-sans text-[#0f172b]">
      <div className="border-b border-[#e5e7eb] bg-[#6c00f6] px-4 py-2 text-center text-sm font-medium text-white">
        30 jours d’essai gratuit, sans carte bancaire.{" "}
        <Link href={`${APP_URL}/inscription`} className="font-bold text-white underline underline-offset-4">
          Créer mon compte
        </Link>
      </div>

      <header className="sticky top-0 z-30 border-b border-[#e5e7eb] bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5">
          <BrandMark />
          <nav className="hidden items-center gap-7 text-sm font-medium text-[#0f172b] md:flex">
            <a href="#fonctionnalites" className="hover:text-[#6c00f6]">
              Fonctionnalités
            </a>
            <a href="#cas-usage" className="hover:text-[#6c00f6]">
              Cas d’usage
            </a>
            <a href="#tarifs" className="hover:text-[#6c00f6]">
              Tarifs
            </a>
            <a href="#faq" className="hover:text-[#6c00f6]">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href={`${APP_URL}/connexion`}
              className="hidden text-sm font-semibold text-[#0f172b] transition hover:text-[#6c00f6] sm:inline-flex"
            >
              Connexion
            </Link>
            <PurpleButton href={`${APP_URL}/inscription`}>Essai gratuit</PurpleButton>
          </div>
        </div>
      </header>

      <section className="overflow-hidden px-5 pb-20 pt-20 md:pt-28">
        <div className="mx-auto max-w-[1200px] text-center">
          <span className="rounded-[4px] bg-[#7f22fe]/10 px-2 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[#7f22fe]">
            Animation phygitale & fidélisation
          </span>
          <h1 className="mx-auto mt-6 max-w-5xl text-[42px] font-bold leading-[1.03] tracking-[-0.06em] text-[#0f172b] md:text-[64px]">
            Transformez les visiteurs anonymes de votre point de vente en clients fidèles.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#475569]">
            Créez des jeux concours sur-mesure accessibles par QR Code. Capturez des
            coordonnées qualifiées, boostez vos avis Google et animez votre boutique en quelques
            minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <PurpleButton href={`${APP_URL}/inscription`}>Lancer mon essai gratuit de 30 jours</PurpleButton>
            <GhostLink href="#demo">Essayer la démo interactive</GhostLink>
          </div>
          <p className="mt-4 text-sm text-[#90a1b9]">
            Inscription instantanée. Aucune carte bancaire requise.
          </p>
          <div id="demo">
            <LandingDemo />
          </div>
        </div>
      </section>

      <section className="bg-[#f1f5f9] px-5 py-10">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-center text-sm font-medium text-[#90a1b9]">
            Ils dynamisent leur trafic physique avec Okado
          </p>
          <div className="mt-8 grid gap-3 text-center text-sm font-semibold text-[#475569] sm:grid-cols-2 lg:grid-cols-4">
            {trustSegments.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center justify-center gap-3 rounded-[20px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-[0_0_24px_rgba(55,65,81,0.06)]"
              >
                <Icon className="h-5 w-5 text-[#90a1b9]" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="px-5 py-20 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <SectionHeading
            eyebrow="Produit"
            title="Une mécanique fluide conçue pour le terrain."
            text="Vos clients sont pressés, votre personnel est occupé. Okado élimine les frictions pour se concentrer sur l’essentiel : l’engagement mesurable."
          />
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="flex min-h-[290px] flex-col rounded-[20px] border border-[#e5e7eb] bg-white p-5 shadow-[0_0_24px_rgba(55,65,81,0.10)]"
              >
                <div className="grid h-10 w-10 place-items-center rounded-[8px] border border-[#e5e7eb]">
                  <feature.icon className="h-5 w-5 text-[#0f172b]" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-[#0f172b]">
                  {feature.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-[#475569]">{feature.text}</p>
                <Link
                  href={`${APP_URL}/inscription`}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-[8px] bg-[linear-gradient(to_right,#6c00f6_0%,#4f46e5_100%)] px-4 py-2.5 text-sm font-semibold !text-white"
                >
                  Explorer
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="cas-usage" className="bg-[#f1f5f9] px-5 py-20 md:py-24">
        <div className="mx-auto max-w-[1200px]">
          <SectionHeading
            eyebrow="Cas d’usage"
            title="Une solution adaptée à vos ambitions."
            text="Okado sert les usages du quotidien comme les temps forts : comptoir, événement local, journée portes ouvertes ou animation multi-commerçants."
          />
          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {useCases.map((useCase) => (
              <article
                key={useCase.label}
                className="rounded-[20px] border border-[#e5e7eb] bg-white p-6 shadow-[0_0_24px_rgba(55,65,81,0.10)]"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-[8px] border border-[#e5e7eb]">
                    <useCase.icon className="h-5 w-5 text-[#0f172b]" />
                  </div>
                  <span className="rounded-[4px] bg-[#7f22fe]/10 px-2 py-1.5 text-xs font-medium text-[#7f22fe]">
                    {useCase.label}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold leading-snug tracking-[-0.03em] text-[#0f172b]">
                  {useCase.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[#475569]">{useCase.text}</p>
                {useCase.href ? (
                  <Link
                    href={useCase.href}
                    className="mt-5 inline-flex text-sm font-semibold text-[#145aff] underline-offset-4 hover:underline"
                  >
                    {useCase.cta}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-8 rounded-[20px] border border-[#e5e7eb] bg-white p-6 shadow-[0_0_24px_rgba(55,65,81,0.10)] md:grid-cols-[0.85fr_1.15fr] md:p-10">
          <div>
            <span className="rounded-[4px] bg-[#7f22fe]/10 px-2 py-1.5 text-xs font-medium text-[#7f22fe]">
              Parcours sécurisé
            </span>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-[-0.04em] text-[#0f172b] md:text-[42px]">
              Du scan au retrait, chaque étape reste sous contrôle.
            </h2>
            <p className="mt-5 text-base leading-7 text-[#475569]">
              Le client gagne un lot, reçoit son QR Code par e-mail, puis le vendeur scanne le
              coupon au comptoir. Un gain ne peut être récupéré qu’une seule fois.
            </p>
            <div className="mt-8">
              <GhostLink href={`${APP_URL}/inscription`}>Tester le parcours</GhostLink>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {secureSteps.map(({ title, icon: Icon, text }) => (
              <div key={title} className="rounded-[20px] border border-[#e5e7eb] bg-[#f8fafc] p-5">
                <Icon className="h-5 w-5 text-[#6c00f6]" />
                <h3 className="mt-4 text-lg font-semibold text-[#0f172b]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#475569]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tarifs" className="bg-[#f1f5f9] px-5 py-20 md:py-24">
        <div className="mx-auto max-w-[920px]">
          <SectionHeading
            eyebrow="Tarif"
            title="Un tarif unique, sans engagement, sans surprise."
            text="Rentabilisez votre abonnement dès le premier lead ou avis Google récolté."
          />
          <div className="mt-12 overflow-hidden rounded-[20px] border border-[#e5e7eb] bg-white shadow-[0_0_24px_rgba(55,65,81,0.10)]">
            <div className="grid gap-8 p-6 md:grid-cols-[0.9fr_1.1fr] md:p-10">
              <div>
                <p className="text-sm font-semibold text-[#7f22fe]">Formule Pro</p>
                <LocalizedPrice />
                <div className="mt-7">
                  <PurpleButton href={`${APP_URL}/inscription`}>Commencer mon essai gratuit</PurpleButton>
                </div>
              </div>
              <div className="grid gap-3">
                {included.map((item) => (
                  <div key={item} className="flex gap-3 text-sm leading-6 text-[#0f172b]">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#7f22fe]/10">
                      <Check className="h-3.5 w-3.5 text-[#6c00f6]" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:py-24">
        <div className="mx-auto max-w-[1200px] rounded-[20px] bg-[linear-gradient(to_right_bottom,rgb(50,30,72),rgb(28,16,43))] p-8 text-white md:p-12">
          <Trophy className="h-8 w-8 text-white/80" />
          <p className="mt-7 max-w-4xl text-2xl font-medium leading-snug tracking-[-0.03em] md:text-4xl">
            “Le bon outil n’ajoute pas une couche marketing. Il transforme le trafic déjà présent
            en données, avis et retours en boutique mesurables.”
          </p>
          <p className="mt-8 text-sm font-semibold text-white/70">Okado · activation locale</p>
        </div>
      </section>

      <section id="faq" className="bg-[#f1f5f9] px-5 py-20 md:py-24">
        <div className="mx-auto max-w-[900px]">
          <SectionHeading
            eyebrow="FAQ"
            title="Des réponses claires à vos questions."
            text="Les principales objections opérationnelles, juridiques et financières avant de lancer une animation en point de vente."
          />
          <div className="mt-12 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-[20px] border border-[#e5e7eb] bg-white p-5 shadow-[0_0_24px_rgba(55,65,81,0.08)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-semibold text-[#0f172b]">
                  {faq.question}
                  <ChevronDown className="h-5 w-5 shrink-0 text-[#90a1b9] transition group-open:rotate-180" />
                </summary>
                <p className="mt-4 text-sm leading-7 text-[#475569]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:py-24">
        <div className="mx-auto max-w-[980px] text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-[12px] border border-[#e5e7eb] shadow-[0_0_24px_rgba(55,65,81,0.08)]">
            <Gift className="h-6 w-6 text-[#6c00f6]" />
          </div>
          <h2 className="mt-6 text-3xl font-bold leading-tight tracking-[-0.04em] text-[#0f172b] md:text-[46px]">
            Prêt à redynamiser votre point de vente dès aujourd’hui ?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#475569]">
            Rejoignez les restaurateurs, commerçants, concessions qui modernisent leur relation
            client. Testez toutes les fonctionnalités gratuitement pendant 30 jours.
          </p>
          <div className="mt-8">
            <PurpleButton href={`${APP_URL}/inscription`}>Créer mon compte gratuitement</PurpleButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e5e7eb] bg-white px-5 py-12">
        <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <BrandMark />
            <p className="mt-5 max-w-sm text-sm leading-7 text-[#475569]">
              Solution SaaS d’animation phygitale et de capture de leads locaux via QR Code.
              Déployée sur une infrastructure rapide et pensée pour les équipes terrain.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0f172b]">Liens utiles</p>
            <div className="mt-4 grid gap-3 text-sm text-[#475569]">
              <Link href={`${APP_URL}/connexion`}>Se connecter au back-office</Link>
              <a href="#tarifs">Tarifs & fonctionnalités</a>
              <a href="mailto:contact@okado.app">Support client</a>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0f172b]">Cadre juridique</p>
            <div className="mt-4 grid gap-3 text-sm text-[#475569]">
              <Link href="/campaign/reglement">Règlement général des jeux & CGU</Link>
              <Link href="/cgv">CGV & DPA</Link>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-[1200px] border-t border-[#e5e7eb] pt-6 text-xs leading-6 text-[#90a1b9]">
          © 2026 Okado. Tous droits réservés. Édité par BRUNELLE PEROLS INVESTISSEMENT,
          SAS au capital de 40 000 €, SIRET : 99177964600017, RCS Versailles 991 779 646.
          Siège social : Dammartin-en-Serve, France.
        </div>
      </footer>
    </main>
  );
}
