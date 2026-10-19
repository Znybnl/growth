import Link from "next/link";
import { Check } from "lucide-react";
import { LandingDemo } from "@/components/marketing/landing-demo";
import { CompactTracking, GiftSuggestions, HomeHero, SectorExamples } from "@/components/marketing/home-showcase";
import { TemplateGallery } from "@/components/marketing/template-gallery";
import { LocalizedPrice } from "@/components/marketing/localized-price";
import { PrimaryButton } from "@/components/marketing/primary-button";
import { PageSchema } from "@/components/marketing/structured-data";
import { accountConnectionFaq } from "@/lib/marketing-faqs";
import { APP_URL, pageMetadata, reviewIndependence } from "@/lib/site";
import styles from "@/components/marketing/showcase.module.css";

export const metadata = pageMetadata("/", "Jeux par QR code pour commerces : roue et ticket à gratter | Okado",
  "Donnez à vos clients une raison de revenir avec une roue ou un ticket à gratter par QR code. Jeux personnalisables, lots et retraits suivis. Essai de 30 jours.");

const faqs = [
  accountConnectionFaq,
  { question: "Est-ce compliqué à mettre en place ?", answer: "Choisissez une roue ou un ticket à gratter, personnalisez le modèle et ajoutez vos lots. Testez le parcours en prévisualisation, puis publiez et affichez votre QR code. Vous n’avez pas besoin de développer une application." },
  { question: "Quels cadeaux puis-je proposer ?", answer: "Une prestation, un complément de soin, un café, un produit découverte ou une remise sur une prochaine visite. La bibliothèque propose des idées ; vous adaptez les lots, leurs stocks et leurs conditions à votre établissement." },
  { question: "Combien vont me coûter les lots ?", answer: "Les lots restent à votre charge. Vous renseignez leur coût estimé, leurs probabilités et leurs stocks. Les suggestions sont modifiables : choisissez des cadeaux compatibles avec votre coût réel et votre capacité à les remettre." },
  { question: "Le joueur a-t-il besoin d’une application ou d’un compte ?", answer: "Non. Le QR code ouvre le jeu dans le navigateur du téléphone. La collecte d’e-mail avant le jeu est optionnelle ; sinon les coordonnées nécessaires sont demandées au gagnant pour lui transmettre son gain." },
  { question: "Comment mes clients récupèrent-ils leur gain ?", answer: "Le gagnant reçoit son gain par e-mail. Dans votre établissement, l’équipe ouvre son QR individuel, vérifie les dates et conditions, puis valide le retrait avec le PIN. Un gain déjà retiré ne peut pas être remis une deuxième fois." },
  { question: "Puis-je utiliser Okado sans demander d’avis Google ?", answer: "Oui. Vous pouvez créer un jeu sans action Google. " + reviewIndependence + " Un clic vers Google ne prouve pas qu’un avis a été publié." },
  { question: "Puis-je arrêter après mon essai ?", answer: "L’essai dure 30 jours, sans carte bancaire. Un abonnement est nécessaire pour poursuivre l’exploitation après l’essai. L’offre est sans engagement ; les lots restent à votre charge." },
  { question: "Comment sont gérées les données des joueurs ?", answer: "Le consentement marketing est distinct et facultatif. Il ne conditionne ni le jeu ni le gain. Vous définissez l’usage de vos contacts ; la politique de confidentialité et le DPA précisent le périmètre du service." },
];

export default function IndexPage() {
  return <main id="contenu" className={styles.home}>
    <PageSchema path="/" name="Okado — jeux par QR code" faqs={faqs} />
    <HomeHero />
    <section id="demo" aria-label="Démonstration interactive" className={styles.demo}><LandingDemo /></section>
    <TemplateGallery />
    <GiftSuggestions />
    <SectorExamples />
    <CompactTracking />
    <section id="tarifs" aria-labelledby="pricing-title" className={`${styles.container} ${styles.section}`}>
      <h2 id="pricing-title" className={styles.heading}>Une offre simple.<br />Des coûts explicites.</h2>
      <div className={`${styles.pricing} mt-8`}>
        <div><h3>Okado Pro</h3><LocalizedPrice /><div className="mt-6"><PrimaryButton href={`${APP_URL}/inscription`} trackingName="start_trial" trackingLocation="pricing">Essayer gratuitement</PrimaryButton></div><Link href="/tarifs" className={`${styles.link} mt-3`}>Voir tous les tarifs et conditions</Link></div>
        <ul>{["Roue et ticket à gratter personnalisables", "Jeux et participations illimités, affiches A4/A5 et QR", "E-mails de gain, suivi des retraits et export CSV", "30 jours sans carte, puis sans engagement"].map(item => <li key={item}><Check aria-hidden="true" />{item}</li>)}<li>Les lots et l’impression de vos supports restent à votre charge.</li></ul>
      </div>
    </section>
    <section id="faq" aria-labelledby="faq-title" className={`${styles.container} ${styles.section} ${styles.faq}`}>
      <h2 id="faq-title" className={styles.heading}>Les réponses avant de vous lancer.</h2>
      <div className="mt-8">{faqs.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
      <p className={`${styles.note} mt-6`}><Link href="/confidentialite" className="underline underline-offset-4">Confidentialité</Link> · <Link href="/cgv" className="underline underline-offset-4">CGV et DPA</Link> · <Link href="/guides" className="underline underline-offset-4">Guides pratiques</Link></p>
    </section>
    <section className={`${styles.container} pb-16`}><div className={styles.finalCta}><h2 className={styles.heading}>Prêt à donner une nouvelle raison de revenir à vos clients ?</h2><PrimaryButton href={`${APP_URL}/inscription`} trackingName="start_trial" trackingLocation="footer">Essayer gratuitement</PrimaryButton></div></section>
  </main>;
}
