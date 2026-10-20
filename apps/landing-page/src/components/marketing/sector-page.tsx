import Image from "next/image";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { DemoExplorer } from "@/components/marketing/demo-explorer";
import { PrimaryButton } from "@/components/marketing/primary-button";
import { PageSchema } from "@/components/marketing/structured-data";
import { PricingReminder } from "@/components/marketing/site-navigation";
import { BeautyUseCases } from "@/components/marketing/beauty-use-cases";
import { MerchantProof } from "@/components/marketing/merchant-proof";
import { GamePreview } from "@/components/marketing/game-preview";
import { heroModel } from "@/lib/marketing-examples";
import styles from "./showcase.module.css";
import { accountConnectionFaq } from "@/lib/marketing-faqs";
import { APP_URL, reviewIndependence } from "@/lib/site";

export function SectorPage({ beauty }: { beauty: boolean }) {
  const path = beauty ? "/instituts-beaute" : "/restaurants";
  const title = beauty
    ? "Un jeu à l’image de votre institut. Une raison de revenir."
    : "Un jeu par QR code pour animer votre restaurant.";
  const faqs = [
    accountConnectionFaq,
    {
      question: "Le gain dépend-il d’un avis Google ?",
      answer: `Non. ${reviewIndependence} Un clic vers la fiche Google n’est pas une preuve d’avis publié.`,
    },
    {
      question: "Quand les coordonnées sont-elles demandées ?",
      answer:
        "Vous pouvez activer la collecte d’e-mail avant le jeu. Sinon, les coordonnées nécessaires à l’envoi du gain sont demandées au gagnant. Le consentement marketing est distinct et facultatif.",
    },
    {
      question: "Comment éviter qu’un lot soit récupéré deux fois ?",
      answer:
        "Chaque gain possède un QR et un code de retrait. Le personnel vérifie les dates et les conditions, puis confirme avec le PIN de l’établissement. Un gain déjà retiré ne peut pas être remis une deuxième fois.",
    },
    {
      question: "Quels cadeaux choisir ?",
      answer: beauty
        ? "Une remise sur une prochaine prestation, un produit découverte ou un complément de soin peuvent convenir. Choisissez selon votre activité, votre coût et vos capacités ; renseignez toute condition d’achat."
        : "Un café, un dessert, un supplément ou une remise peuvent convenir à votre carte. Les dotations et leur coût restent à votre charge ; leurs conditions doivent être claires pour le client.",
    },
    {
      question: "Combien coûte Okado ?",
      answer:
        "L’offre Pro est affichée à 20 € HT par mois en France, sans engagement, avec 30 jours d’essai sans carte bancaire. Les lots et l’impression des supports ne sont pas financés par l’abonnement. Consultez les tarifs pour le détail.",
    },
    {
      question: "Où trouver les informations sur mes données ?",
      answer:
        "Vous gardez le contrôle de l’usage de vos contacts et de leurs consentements. Okado fournit la plateforme technique. Les fournisseurs et le cadre du service sont présentés dans Sécurité et données, la confidentialité et les CGV/DPA.",
    },
  ];
  const ideas = beauty
    ? [
        {
          title: "Regard, cils et sourcils",
          text: "Un avantage lié à une prochaine prestation, avec la condition d’utilisation clairement indiquée.",
        },
        {
          title: "Ongles et coiffure",
          text: "Un supplément ou une remise à adapter à votre carte, à vos coûts et au temps disponible.",
        },
        {
          title: "Soins, massage et spa",
          text: "Un produit découverte ou un complément de soin pour présenter votre univers.",
        },
      ]
    : [
        {
          title: "Salle et brasserie",
          text: "Une affiche visible sur table et un lot simple à présenter lors d’un prochain passage.",
        },
        {
          title: "Comptoir et vente à emporter",
          text: "Un QR sur un support accessible pendant l’attente, avec une mécanique courte.",
        },
        {
          title: "Café et restauration rapide",
          text: "Un café, un dessert ou un supplément adapté à vos coûts et à votre rythme de service.",
        },
      ];
  return (
    <main
      id="contenu"
      className={
        beauty ? "bg-[#fffaf8] text-[#24142a]" : "bg-[#fffaf4] text-[#0f172b]"
      }
    >
      <PageSchema
        path={path}
        name={
          beauty
            ? "Okado pour les instituts de beauté"
            : "Okado pour les restaurants"
        }
        faqs={faqs}
      />
      <section className="mx-auto max-w-[1100px] px-5 pb-10 pt-12 md:pt-20">
        <nav aria-label="Fil d’Ariane" className="mb-7 text-sm text-[#64748b]">
          <Link href="/" className="underline">
            Okado
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          {beauty ? "Instituts de beauté" : "Restaurants"}
        </nav>
        <div className={beauty ? styles.beautyHero : undefined}>
        <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#6c00f6]">
          {beauty ? "Beauté & bien-être" : "Restauration"}
        </p>
        <h1 className="mt-5 max-w-[900px] text-[38px] font-bold leading-[1.08] tracking-[-0.045em] md:text-[62px]">
          {title}
        </h1>
        <p className="mt-6 max-w-[750px] text-lg leading-8 text-[#475569]">
          {beauty
            ? "Une roue ou un ticket à gratter à votre image. Vos clientes jouent depuis un QR code ; vous choisissez les cadeaux et leurs conditions, puis suivez les retraits."
            : "Vos clients jouent sur leur téléphone, découvrent leur résultat et conservent leur coupon de gain. Vous choisissez les lots et votre équipe valide leur remise : du QR code au retrait, le parcours reste lisible."}
        </p>
        <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row">
          <PrimaryButton href={`${APP_URL}/inscription`} trackingName="start_trial" trackingLocation={beauty ? "beauty_hero" : "restaurant_hero"}>
            Essayer gratuitement
          </PrimaryButton>
          <Link
            href="#demo"
            className={`inline-flex items-center justify-center rounded-[12px] border border-[#e8d4dc] bg-white px-5 py-3 text-[15px] font-semibold ${beauty ? "text-[#513049]" : "text-[#31190b]"}`}
          >
            Voir la démo
          </Link>
        </div>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#475569]">
          {[
            "30 jours sans carte",
            "Affiche et QR inclus",
            "Retrait unique par PIN",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[#169c69]" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
        {beauty ? <Link href="#exemples-metiers" className="mt-5 inline-block min-h-11 py-2 text-sm font-semibold text-[#6c00f6] underline underline-offset-4">Explorer les six spécialités beauté</Link> : null}
        </div>
        {beauty ? <GamePreview model={heroModel} eager /> : null}
        </div>
      </section>
      <div className="px-5">
        <PricingReminder />
      </div>
      <section
        id="demo"
        aria-label="Démonstration du jeu"
        className="scroll-mt-32 px-5 pb-16"
      >
        <DemoExplorer sector={beauty ? "beauty" : "restaurant"} />
      </section>
      {beauty ? <BeautyUseCases /> : <section className="mx-auto max-w-[1100px] px-5 py-14">
        <h2 className="text-3xl font-bold tracking-[-0.03em]">
          Des lots adaptés à votre activité.
        </h2>
        <p className="mt-5 max-w-3xl leading-8 text-[#475569]">
          Le lot doit donner envie et rester simple à remettre. Vous choisissez
          son coût estimé, son stock limité ou illimité, sa disponibilité et ses
          conditions d’utilisation. Une réduction et une prestation offerte ne
          représentent pas le même engagement.
        </p>
        <div id="lots" className="mt-8 grid scroll-mt-36 gap-5 md:grid-cols-3">
          {ideas.map((idea) => (
            <article
              key={idea.title}
              className="rounded-2xl border border-[#e5e7eb] bg-white p-6"
            >
              <h3 className="text-xl font-semibold">{idea.title}</h3>
              <p className="mt-4 leading-7 text-[#475569]">{idea.text}</p>
            </article>
          ))}
        </div>
        <Link
          href={
            beauty ? "/guides/lots-institut-beaute" : "/guides/lots-restaurant"
          }
          className="mt-6 inline-block font-semibold text-[#6c00f6] underline underline-offset-4"
        >
          Choisir des lots et leurs conditions
        </Link>
      </section>}
      {beauty ? (
        <MerchantProof beauty />
      ) : (
        <section className="mx-auto grid max-w-[1100px] items-center gap-8 px-5 py-14 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">Une affiche prête à poser.</h2>
            <p className="mt-5 leading-8 text-[#475569]">
              Personnalisez une affiche A4/A5 depuis votre jeu ou importez son
              QR dans votre création Canva. Vérifiez sa lecture sur place avant
              diffusion. Le QR public d’un jeu publié est différent du QR de
              prévisualisation.
            </p>
            <Link
              href="/affiches-qr-code"
              className="mt-5 inline-block font-semibold text-[#6c00f6] underline"
            >
              Découvrir les supports QR
            </Link>
          </div>
          <figure>
            <Image
              src="/images/restaurant-a5-counter.webp"
              alt="Exemple de présentation d’une affiche de jeu QR code sur un comptoir de restaurant"
              width={1600}
              height={900}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="h-auto w-full rounded-3xl"
            />
            <figcaption className="mt-3 text-xs leading-6 text-[#64748b]">
              Illustration de mise en place, pas un résultat client mesuré.
            </figcaption>
          </figure>
        </section>
      )}
      <section
        id={beauty ? "avis" : "avis-google"}
        className="scroll-mt-32 border-y border-[#e5e7eb] bg-white px-5 py-14"
      >
        <div className="mx-auto max-w-[1100px]">
          <h2 className="text-3xl font-bold">
            Demander un avis reste une démarche indépendante.
          </h2>
          <p className="mt-5 max-w-3xl leading-8 text-[#475569]">
            {reviewIndependence} Les liens Google et sociaux ne nécessitent pas
            de connecter vos comptes à Okado. Les clics sont mesurables ; un
            avis publié ou un abonnement social ne sont pas prouvés par ces
            clics.
          </p>
          <Link
            href="/guides/avis-google-jeu-concours"
            className="mt-5 inline-block font-semibold text-[#6c00f6] underline"
          >
            Comprendre la distinction entre avis et jeu
          </Link>
        </div>
      </section>
      <section
        id={beauty ? "retours" : "roi"}
        className="mx-auto max-w-[1100px] scroll-mt-32 px-5 py-16"
      >
        <div className="grid gap-9 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">
              {beauty ? "Quels cadeaux sont récupérés ? Quels lots ajuster ?" : "Mesurez les participations, les gains et les retraits."}
            </h2>
            <p className="mt-5 leading-8 text-[#475569]">
              {beauty ? "Observez les gains et les retraits pour revoir vos dotations. " : ""}Un scan n’est pas encore une partie ; un gain n’est pas encore un
              retrait. Une partie perdue sans coordonnées est comptée. La
              collecte d’e-mail avant le jeu est une option indépendante ; sinon
              les coordonnées nécessaires sont demandées aux gagnants.
            </p>
            <Link
              href="/guides/mesurer-jeu-qr-code"
              className="mt-5 inline-block font-semibold text-[#6c00f6] underline"
            >
              Lire les définitions et les formules
            </Link>
          </div>
          <aside className="rounded-3xl bg-[#24142a] p-7 text-white">
            <h3 className="text-2xl font-semibold">
              Gardez vos coûts sous contrôle.
            </h3>
            <p className="mt-4 leading-8 text-white/85">
              Ajoutez au prix du logiciel le coût de vos lots et de vos
              supports. Un retour avec coupon n’est pas automatiquement une
              vente additionnelle. Comparez des périodes et des hypothèses
              explicites.
            </p>
            <Link
              href="/guides/cout-jeu-marketing"
              className="mt-5 inline-block text-sm font-semibold text-white underline"
            >
              Préparer un budget réaliste
            </Link>
          </aside>
        </div>
      </section>
      <section
        id="faq"
        className="mx-auto max-w-[900px] scroll-mt-32 px-5 py-14"
      >
        <h2 className="text-3xl font-bold">
          Les questions avant de vous lancer.
        </h2>
        <div className="mt-8 divide-y divide-[#e5e7eb] rounded-2xl border border-[#e5e7eb] bg-white px-6">
          {faqs.map((item) => (
            <details key={item.question} className="py-5">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold">
                <span>{item.question}</span>
                <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
              </summary>
              <p className="mt-4 leading-8 text-[#475569]">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="px-5 pb-16">
        <div className="mx-auto flex max-w-[1100px] flex-col justify-between gap-6 rounded-3xl bg-[#f0eafb] p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold">Préparez votre premier jeu.</h2>
            <p className="mt-3 leading-7 text-[#475569]">
              Testez le parcours avant diffusion, avec 30 jours d’essai sans
              carte.
            </p>
          </div>
          <PrimaryButton href={`${APP_URL}/inscription`} trackingName="start_trial" trackingLocation={beauty ? "beauty_footer" : "restaurant_footer"}>
            Essayer gratuitement
          </PrimaryButton>
        </div>
      </section>
    </main>
  );
}
