import Link from "next/link";
import { LandingDemo } from "@/components/marketing/landing-demo";
import { LocalizedPrice } from "@/components/marketing/localized-price";
import { PrimaryButton } from "@/components/marketing/primary-button";
import { PageSchema } from "@/components/marketing/structured-data";
import { accountConnectionFaq } from "@/lib/marketing-faqs";
import { APP_URL, pageMetadata, reviewIndependence } from "@/lib/site";

export const metadata = pageMetadata(
  "/",
  "Jeux par QR code pour commerces : roue et ticket à gratter | Okado",
  "Créez un jeu mobile avec votre logo, vos lots et votre affiche QR. Suivez les participations, gains et retraits. Essai de 30 jours sans carte.",
);
const features = [
  {
    title: "Une roue de la fortune",
    text: "Présentez vos lots sur une roue mobile avec votre logo et votre message.",
    href: "/roue-de-la-fortune",
  },
  {
    title: "Un ticket à gratter",
    text: "Une surprise à découvrir au doigt, dans un modèle adapté à votre univers.",
    href: "/ticket-a-gratter",
  },
  {
    title: "Votre affiche et son QR",
    text: "Personnalisez une affiche A4/A5 ou utilisez le QR seul dans Canva.",
    href: "/affiches-qr-code",
  },
  {
    title: "Des gains sous contrôle",
    text: "Choisissez les probabilités et conditions, puis validez le retrait unique par PIN.",
    href: "/comment-ca-marche",
  },
  {
    title: "Des résultats lisibles",
    text: "Distinguez scans, parties, contacts, gains et retraits, y compris les participations sans coordonnées.",
    href: "/guides/mesurer-jeu-qr-code",
  },
  {
    title: "Des nouvelles par e-mail",
    text: "Choisissez vos alertes et synthèses, et activez si besoin les rappels aux gagnants.",
    href: "/aide/notifications-et-relances",
  },
];
const faqs = [
  accountConnectionFaq,
  {
    question: "Comment fonctionne l’essai gratuit de 30 jours ?",
    answer:
      "Créez votre compte et votre jeu sans carte bancaire. Testez le parcours en prévisualisation avant de publier. Un abonnement est nécessaire pour poursuivre l’exploitation après l’essai ; les lots restent à votre charge.",
  },
  {
    question: "Le joueur a-t-il besoin d’une application ou d’un compte ?",
    answer:
      "Non. Le QR ouvre le jeu dans le navigateur du téléphone. La collecte d’e-mail avant le jeu est optionnelle ; sinon les coordonnées nécessaires sont demandées au gagnant pour lui transmettre son gain.",
  },
  {
    question: "Le jeu oblige-t-il à laisser un avis Google ?",
    answer:
      "Non. " +
      reviewIndependence +
      " Un clic marketing ne prouve ni un avis publié ni un abonnement social.",
  },
  {
    question: "Comment éviter les doubles retraits ?",
    answer:
      "Le personnel ouvre le QR individuel du gagnant, vérifie les conditions puis confirme avec le PIN de l’établissement. Un gain déjà retiré ne peut pas être remis une deuxième fois.",
  },
  {
    question: "Comment sont gérées les données des joueurs ?",
    answer:
      "Le consentement marketing est distinct et facultatif. Il ne conditionne ni le jeu ni le gain. Vous définissez l’usage de vos contacts ; les informations de confidentialité et le DPA précisent le périmètre du service.",
  },
];

export default function IndexPage() {
  return (
    <main id="contenu" className="bg-white text-[#0f172b]">
      <PageSchema path="/" name="Okado — jeux par QR code" faqs={faqs} />
      <section className="mx-auto max-w-[1100px] px-5 pb-10 pt-14 md:pt-20">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6c00f6]">
          Jeux mobiles pour commerces locaux
        </p>
        <h1 className="mt-5 max-w-[950px] text-[40px] font-bold leading-[1.07] tracking-[-0.045em] md:text-[68px]">
          Créez un jeu par QR code. Donnez une raison de revenir.
        </h1>
        <p className="mt-6 max-w-[750px] text-lg leading-8 text-[#475569]">
          Une roue de la fortune ou un ticket à gratter avec votre logo et vos
          lots. Affichez le QR dans votre établissement, puis suivez les
          participations, les gains et les retraits.
        </p>
        <div className="mt-7 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <PrimaryButton href={`${APP_URL}/inscription`}>
            Lancer mon essai gratuit de 30 jours
          </PrimaryButton>
          <Link
            href="#demo"
            className="font-semibold text-[#6c00f6] underline underline-offset-4"
          >
            Essayer la démo interactive
          </Link>
        </div>
        <p className="mt-4 text-sm leading-7 text-[#64748b]">
          Sans carte bancaire. 20 € HT / mois après l’essai, sans engagement.
          Lots à votre charge.
        </p>
      </section>
      <section
        id="demo"
        aria-label="Démonstration interactive"
        className="scroll-mt-32 px-5 pb-16"
      >
        <LandingDemo />
      </section>
      <section
        id="fonctionnalites"
        className="scroll-mt-32 bg-[#f8f6fe] px-5 py-16"
      >
        <div className="mx-auto max-w-[1100px]">
          <h2 className="max-w-2xl text-3xl font-bold tracking-[-0.03em] md:text-4xl">
            Du premier scan au retrait, un parcours complet.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.href}
                className="flex flex-col rounded-2xl border border-[#e5e7eb] bg-white p-7"
              >
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="mt-4 flex-1 leading-7 text-[#475569]">
                  {feature.text}
                </p>
                <Link
                  href={feature.href}
                  className="mt-5 text-sm font-semibold text-[#6c00f6] underline underline-offset-4"
                >
                  Découvrir : {feature.title.toLowerCase()}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section
        id="cas-usage"
        className="mx-auto max-w-[1100px] scroll-mt-32 px-5 py-16"
      >
        <h2 className="text-3xl font-bold tracking-[-0.03em]">
          Pensé pour le rythme de votre établissement.
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {[
            {
              title: "Instituts de beauté et bien-être",
              text: "Des modèles soignés et des lots adaptés au regard, aux ongles, à la coiffure, aux soins et au spa.",
              href: "/instituts-beaute",
            },
            {
              title: "Restaurants et commerces",
              text: "Un support pour la salle, l’attente ou le comptoir, avec des lots et conditions compréhensibles.",
              href: "/restaurants",
            },
          ].map((item) => (
            <article
              key={item.href}
              className="rounded-3xl border border-[#e5e7eb] bg-[#fcfbff] p-7"
            >
              <h3 className="text-2xl font-semibold">{item.title}</h3>
              <p className="mt-4 leading-8 text-[#475569]">{item.text}</p>
              <Link
                href={item.href}
                className="mt-5 inline-block font-semibold text-[#6c00f6] underline"
              >
                Voir les usages et exemples
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-6 max-w-3xl leading-8 text-[#475569]">
          Une boutique, une journée portes ouvertes ou un événement peuvent
          aussi accueillir ce parcours : un jeu mobile, des lots définis par
          l’organisateur et un suivi des retraits.
        </p>
      </section>
      <section className="border-y border-[#e5e7eb] px-5 py-16">
        <div className="mx-auto max-w-[1100px]">
          <h2 className="text-3xl font-bold">
            Vos liens et vos contacts, avec des règles claires.
          </h2>
          <p className="mt-5 max-w-3xl leading-8 text-[#475569]">
            Proposez vos liens Google, Instagram, Facebook, TikTok, Tripadvisor
            ou un lien personnalisé. La collecte d’e-mail avant le jeu est un
            réglage indépendant ; l’accord pour recevoir de la prospection reste
            distinct et facultatif.
          </p>
          <p className="mt-4 max-w-3xl leading-8 text-[#475569]">
            {reviewIndependence}
          </p>
          <Link
            href="/guides/collecte-email-jeu"
            className="mt-5 inline-block font-semibold text-[#6c00f6] underline"
          >
            Comprendre la collecte et les consentements
          </Link>
        </div>
      </section>
      <section
        id="tarifs"
        className="mx-auto max-w-[1000px] scroll-mt-32 px-5 py-16"
      >
        <h2 className="text-3xl font-bold">
          Une offre simple. Des coûts explicites.
        </h2>
        <div className="mt-8 grid gap-8 rounded-3xl border border-[#ded4f3] bg-[#fcfbff] p-7 md:grid-cols-2">
          <div>
            <p className="font-semibold text-[#6c00f6]">Okado Pro</p>
            <LocalizedPrice />
            <div className="mt-6">
              <PrimaryButton href={`${APP_URL}/inscription`}>
                Commencer mon essai gratuit
              </PrimaryButton>
            </div>
            <Link
              href="/tarifs"
              className="mt-5 inline-block text-sm font-semibold text-[#6c00f6] underline"
            >
              Voir tous les tarifs et conditions
            </Link>
          </div>
          <p className="leading-8 text-[#475569]">
            Roue et ticket à gratter, jeux et participations illimités,
            affiches, QR, e-mails de gain, suivi des retraits et export CSV.
            L’abonnement ne finance pas vos cadeaux et leur impression :
            choisissez des lots compatibles avec vos coûts.
          </p>
        </div>
      </section>
      <section
        id="faq"
        className="mx-auto max-w-[900px] scroll-mt-32 px-5 py-16"
      >
        <h2 className="text-3xl font-bold">
          Les réponses avant de vous lancer.
        </h2>
        <div className="mt-8 divide-y divide-[#e5e7eb] rounded-2xl border border-[#e5e7eb] bg-white px-6">
          {faqs.map((item) => (
            <details key={item.question} className="py-5">
              <summary className="cursor-pointer font-semibold">
                {item.question}
              </summary>
              <p className="mt-4 leading-8 text-[#475569]">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
