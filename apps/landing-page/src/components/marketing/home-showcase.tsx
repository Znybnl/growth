import Link from "next/link";
import { ArrowRight, Check, ChartNoAxesCombined, Gift, Leaf, Palette, QrCode, SlidersHorizontal } from "lucide-react";
import { commerceModel, gameModels, heroModel, restaurantModel } from "@/lib/marketing-examples";
import { APP_URL } from "@/lib/site";
import { GamePreview } from "./game-preview";
import { PrimaryButton } from "./primary-button";
import styles from "./showcase.module.css";

export function HomeHero() {
  return <section className={`${styles.container} ${styles.hero}`} aria-labelledby="home-hero-title">
    <div className={styles.heroCopy}>
      <p className={styles.eyebrow}>Jeux interactifs & fidélisation</p>
      <h1 id="home-hero-title">Donnez à vos clients une bonne raison de <em>revenir.</em></h1>
      <p>Une roue de la fortune ou un ticket à gratter à votre image. Vos clients scannent un QR code, jouent sur leur téléphone et peuvent gagner un cadeau à utiliser lors d’une prochaine visite.</p>
      <div className={styles.actions}>
        <PrimaryButton href={`${APP_URL}/inscription`} trackingName="start_trial" trackingLocation="hero">Essayer gratuitement</PrimaryButton>
        <PrimaryButton href="#demo" trackingName="view_demo" trackingLocation="hero" appearance="secondary">Voir la démo</PrimaryButton>
      </div>
      <p className={styles.reassurance}>30 jours gratuits · Sans carte bancaire · Sans engagement</p><p className={styles.note}>Puis 20 € HT/mois. Les lots restent à votre charge.</p>
      <ul aria-label="Les points forts d’Okado" className={styles.benefits}>
        <li><Palette aria-hidden="true" />Jeux personnalisables</li><li><Gift aria-hidden="true" />Lots maîtrisés</li><li><ChartNoAxesCombined aria-hidden="true" />Retraits suivis</li>
      </ul>
    </div>
    <figure className={styles.heroVisual}>
      <div className={styles.journey}>
        <div className={styles.journeyPoster} aria-hidden="true">
          <span className={styles.posterBrand}><Leaf size={15} />Maison Botanique</span>
          <span className={styles.posterKicker}>Une attention pour vous</span>
          <strong className={styles.posterHeadline}>Une surprise<br />vous attend.</strong>
          <span className={styles.posterCopy}>À découvrir lors de votre prochaine visite.</span>
          <span className={styles.posterQr}><QrCode size={48} strokeWidth={1.5} /></span>
          <span className={styles.posterAction}>Scannez pour jouer</span>
        </div>
        <div className={styles.journeyPlay}><GamePreview model={heroModel} eager /></div>
        <div className={styles.journeyReward} aria-hidden="true">
          <div className={styles.rewardHeader}><span>MAISON BOTANIQUE</span><span>VOTRE CADEAU</span></div>
          <span className={styles.rewardIcon}><Gift size={22} strokeWidth={1.5} /></span>
          <strong>Un masque<br />offert.</strong>
          <small>Avec un soin visage payant.</small>
          <span className={styles.rewardFooter}>Votre gain confirmé par e-mail</span>
        </div>
        <div className={styles.journeySteps} aria-hidden="true"><span><b>1</b>Scanne</span><span><b>2</b>Joue</span><span><b>3</b>Découvre</span></div>
      </div>
      <figcaption className={`${styles.note} text-center mt-4`}>Parcours illustré avec un vrai rendu de jeu. Exemple fictif.</figcaption>
    </figure>
  </section>;
}

export function GiftSuggestions() {
  return <section id="fonctionnalites" aria-labelledby="gift-title" className={`${styles.gifts} ${styles.section}`}>
    <div className={`${styles.container} ${styles.giftGrid}`}>
      <div><p className={styles.eyebrow}>Des lots adaptés à votre activité</p><h2 id="gift-title" className={styles.heading}>Pas d’idée de cadeau ?<br />On vous aide.</h2>
        <p className={styles.intro}>Partez de la bibliothèque de suggestions, puis adaptez les cadeaux à vos prestations, à vos coûts et à votre temps disponible.</p>
        <ul className={styles.giftList}>
          <li><Gift aria-hidden="true" /><strong>Des idées par spécialité</strong><p>Du nail art au soin visage, des exemples pour vous lancer.</p></li>
          <li><SlidersHorizontal aria-hidden="true" /><strong>Vous gardez le dernier mot</strong><p>Coûts estimés, probabilités, stocks et conditions : vous choisissez vos réglages.</p></li>
          <li><Check aria-hidden="true" /><strong>Un cadeau, des conditions claires</strong><p>Indiquez quand et comment votre client peut en profiter.</p></li>
        </ul>
        <Link href="/guides/lots-institut-beaute" className={`${styles.link} mt-5`}>Trouver des idées de lots <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <figure className={styles.library}>
        <figcaption className={styles.libraryHeader}><strong>Quelques suggestions</strong><span>Activité · Ongles</span></figcaption>
        {[
          { name: "French offerte", probability: "15 %", cost: "3 €", condition: "Avec une pose payante." },
          { name: "Nail art offert", probability: "15 %", cost: "2 €", condition: "Jusqu’à 2 ongles, avec une pose payante." },
          { name: "Pose offerte", probability: "3 %", cost: "15 €", condition: "Pose semi-permanente mains, couleur unie." },
        ].map(item => <div key={item.name} className={styles.suggestion}><div className={styles.suggestionHead}><strong>{item.name}</strong><span>{item.probability}</span></div><p>{item.condition}<br />Coût estimé pour l’établissement : {item.cost}.</p></div>)}
        <p className={styles.note}>Extraits de la bibliothèque Beauté. Valeurs indicatives et modifiables : adaptez-les à vos coûts réels. Chaque probabilité concerne une suggestion, pas un jeu complet.</p>
      </figure>
    </div>
  </section>;
}

export function SectorExamples() {
  const sectors = [
    { title: "Beauté & bien-être", text: "Un masque avec un soin, une French avec une pose : des attentions liées à vos prestations.", href: "/instituts-beaute", action: "Explorer la beauté", model: gameModels[0], variant: "beauty" },
    { title: "Restaurants & cafés", text: "Un dessert, un café ou un avantage à savourer lors d’une prochaine visite.", href: "/restaurants", action: "Explorer la restauration", model: restaurantModel, variant: "restaurant" },
    { title: "Boutiques & commerces", text: "Un produit découverte ou un petit cadeau pour accompagner un prochain achat.", href: "#demo", action: "Découvrir les possibilités", model: commerceModel, variant: "retail" },
  ];
  return <section id="cas-usage" aria-labelledby="sectors-title" className={`${styles.section} ${styles.container}`}>
    <p className={styles.eyebrow}>Pour les commerces locaux</p><h2 id="sectors-title" className={`${styles.heading} mt-4`}>Votre activité. Vos clients. Votre jeu.</h2>
    <p className={styles.intro}>Des animations et des récompenses à adapter à chaque établissement.</p>
    <div className={styles.sectorGrid}>{sectors.map(sector => <article key={sector.title} className={styles.sectorCard}>
      <div className={styles.sectorArt}><GamePreview model={sector.model} /></div><div className={styles.sectorCopy}><h3>{sector.title}</h3><p>{sector.text}</p>
        <PrimaryButton href={sector.href} trackingName="explore_sector" trackingLocation="sectors" appearance="text" trackingVariant={sector.variant}>{sector.action}</PrimaryButton>
      </div>
    </article>)}</div>
    <p className={`${styles.note} mt-5`}>Enseignes et lots fictifs, proposés pour illustrer les possibilités. Les conditions sont définies par l’établissement.</p>
  </section>;
}

export function CompactTracking() {
  return <section id="suivi" aria-labelledby="tracking-title" className={`${styles.section} ${styles.tracking}`}>
    <div className={`${styles.container} ${styles.trackingGrid}`}>
      <div><p className={styles.eyebrow}>Après la partie, gardez le fil</p><h2 id="tracking-title" className={`${styles.heading} mt-4`}>Un jeu amusant.<br />Un suivi concret.</h2><p className={styles.intro}>Consultez les participations, les gains attribués et les lots réellement récupérés. Vos synthèses par e-mail sont activables aux fréquences choisies.</p>
        <Link href="/comment-ca-marche" className={styles.link}>Découvrir le suivi des gains <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <dl className={styles.trackingLabels}><div><dt>Participations</dt><dd>Les parties effectivement commencées.</dd></div><div><dt>Gains attribués</dt><dd>Les cadeaux remportés par vos clients.</dd></div><div><dt>Lots récupérés</dt><dd>Les retraits validés par votre équipe.</dd></div></dl>
    </div>
    <p className={`${styles.container} ${styles.note} mt-7`}>Un retrait confirme l’utilisation d’un gain. Il ne prouve pas, à lui seul, une vente supplémentaire. <Link href="/aide/notifications-et-relances" className="underline underline-offset-4">En savoir plus sur les notifications.</Link></p>
  </section>;
}
