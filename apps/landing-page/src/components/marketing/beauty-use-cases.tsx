import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift, QrCode } from "lucide-react";
import styles from "./product-proof.module.css";

const examples = [
  { sector: "Regard · cils & sourcils", name: "Studio Regard", title: "Un joli regard, une surprise.", reward: "Teinture des sourcils offerte", condition: "Valable avec un Brow Lift acheté, lors d’une prochaine visite.", theme: "nude", asset: "beauty-nude-elegance", template: "Nude Élégance" },
  { sector: "Ongles", name: "Maison Manucure", title: "Une touche de couleur en plus.", reward: "Nail art sur 2 ongles offert", condition: "Valable avec une pose de vernis semi-permanent achetée.", theme: "lilac", asset: "beauty-lilas-soin-doux", template: "Lilas Soin Doux" },
  { sector: "Massage & Spa", name: "Parenthèse Spa", title: "Votre parenthèse commence ici.", reward: "Un produit découverte offert", condition: "Sans achat requis. À retirer à l’accueil pendant sa période de validité.", theme: "botanical", asset: "beauty-botanical-premium", template: "Botanique Premium" },
];

export function BeautyUseCases() {
  return (
    <section id="exemples-metiers" aria-labelledby="beauty-examples-title" className={styles.section}>
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Des idées adaptées à vos prestations</p>
        <h2 id="beauty-examples-title">Votre métier. Vos cadeaux.<br />Votre identité.</h2>
        <p>Partez d’un modèle et des suggestions de votre spécialité. Ajustez les lots et leurs conditions à votre carte, à vos coûts et à votre temps disponible.</p>
      </div>
      <div id="lots" className={styles.useCaseGrid}>
        {examples.map((example) => (
          <article key={example.theme} className={styles.useCase} data-theme={example.theme} data-testid="beauty-use-case">
            <div className={styles.composition}>
              <div className={styles.ticket}>
                <Image src={`/images/sample-${example.asset}.webp`} alt="" fill sizes="(min-width: 1024px) 230px, (min-width: 640px) 40vw, 220px" className={styles.artwork} />
                <div className={styles.ticketContent}>
                  <p className={styles.exampleBrand}>{example.name}</p>
                  <span className={styles.brandRule} />
                  <p className={styles.ticketTitle}>{example.title}</p>
                  <p className={styles.ticketSubtitle}>Grattez pour découvrir votre surprise</p>
                  <div className={styles.foil}><Gift size={35} strokeWidth={1.3} aria-hidden="true" /><span>Zone à gratter</span></div>
                </div>
              </div>
              <div className={styles.poster} aria-hidden="true">
                <p>{example.name}</p><span className={styles.brandRule} /><strong>Scannez<br />et jouez</strong><QrCode size={55} strokeWidth={1.4} /><span>Votre surprise vous attend</span>
              </div>
              <span className={styles.compositionLabel}>Jeu mobile + affiche assortie</span>
            </div>
            <div className={styles.useCaseCopy}>
              <p className={styles.eyebrow}>{example.sector}</p>
              <h3>{example.reward}</h3>
              <p>{example.condition}</p>
              <p className={styles.note}>Modèle {example.template} · logo, textes et lots personnalisables.</p>
            </div>
          </article>
        ))}
      </div>
      <p className={styles.note}>Enseignes, lots et compositions fictifs, à adapter à votre activité. Aperçus simplifiés avec les fonds Okado ; ils ne constituent ni un jeu actif ni un résultat client. Les QR sont des pictogrammes non utilisables.</p>
      <div className="flex flex-wrap gap-x-6">
        <Link href="/ticket-a-gratter" className={styles.link}>Découvrir les modèles et leurs réglages <ArrowRight size={16} aria-hidden="true" /></Link>
        <Link href="/guides/lots-institut-beaute" className={styles.link}>Choisir des lots et leurs conditions <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
