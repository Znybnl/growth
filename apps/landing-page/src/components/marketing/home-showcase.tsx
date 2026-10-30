import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { commerceModel, gameModels, restaurantModel } from "@/lib/marketing-examples";
import { APP_URL } from "@/lib/site";
import { GamePreview } from "./game-preview";
import { PrimaryButton } from "./primary-button";
import styles from "./showcase.module.css";

export function HomeHero() {
  return <section className={`${styles.container} ${styles.hero}`} aria-labelledby="home-hero-title">
    <div className={styles.heroCopy}>
      <h1 id="home-hero-title"><span>Donnez à vos clients</span>{" "}<span>une bonne raison de <em>revenir.</em></span></h1>
      <p>Une roue de la fortune à votre image.<br />Vos clients scannent, jouent et peuvent gagner un cadeau à utiliser lors d’une prochaine visite.</p>
    </div>
    <div className={styles.heroSignup}>
      <PrimaryButton href={`${APP_URL}/inscription`} trackingName="start_trial" trackingLocation="hero">Essayer gratuitement</PrimaryButton>
      <p>30 jours sans carte bancaire, sans engagement.</p>
    </div>
  </section>;
}

export function SectorExamples() {
  const sectors = [
    { title: "Beauté & bien-être", text: "Un masque avec un soin, une French avec une pose : des attentions liées à vos prestations.", href: "/instituts-beaute", action: "Explorer la beauté", model: gameModels[0], variant: "beauty" },
    { title: "Restaurants & cafés", text: "Un dessert, un café ou un avantage à savourer lors d’une prochaine visite.", href: "/restaurants", action: "Explorer la restauration", model: restaurantModel, variant: "restaurant" },
    { title: "Boutiques & commerces", text: "Un produit découverte ou un petit cadeau pour accompagner un prochain achat.", href: "#demo-retail", action: "Essayer le ticket boutique", model: commerceModel, variant: "retail" },
  ];
  return <section id="cas-usage" aria-labelledby="sectors-title" className={`${styles.section} ${styles.container}`}>
    <p className={styles.eyebrow}>Pour les commerces locaux</p><h2 id="sectors-title" className={`${styles.heading} mt-4`}>Votre activité. Vos clients. Votre jeu.</h2>
    <p className={styles.intro}>Des animations et des récompenses à adapter à chaque établissement.</p>
    <div className={styles.sectorGrid}>{sectors.map(sector => <article key={sector.title} className={styles.sectorCard}>
      <div className={styles.sectorArt}><GamePreview model={sector.model} sizes="(min-width: 768px) 168px, (min-width: 360px) 102px, 92px" /></div><div className={styles.sectorCopy}><h3>{sector.title}</h3><p>{sector.text}</p>
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
