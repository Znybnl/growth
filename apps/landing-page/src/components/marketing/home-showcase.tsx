import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import beautyPreview from "../../../public/images/demo-beauty.webp";
import restaurantPreview from "../../../public/images/demo-restaurant.webp";
import retailPreview from "../../../public/images/demo-retail.webp";
import dashboard from "../../../public/images/merchant-dashboard.webp";
import counter from "../../../public/images/restaurant-a5-counter.webp";
import { APP_URL } from "@/lib/site";
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
    { title: "Beauté & bien-être", text: "Un masque avec un soin, une French avec une pose : des attentions liées à vos prestations.", href: "/instituts-beaute", action: "Explorer la beauté", image: beautyPreview, variant: "beauty" },
    { title: "Restaurants & cafés", text: "Un dessert, un café ou un avantage à savourer lors d’une prochaine visite.", href: "/restaurants", action: "Explorer la restauration", image: restaurantPreview, variant: "restaurant" },
    { title: "Boutiques & commerces", text: "Un produit découverte ou un petit cadeau pour accompagner un prochain achat.", href: "#demo-retail", action: "Essayer le ticket boutique", image: retailPreview, variant: "retail" },
  ];
  return <section id="cas-usage" aria-labelledby="sectors-title" className={`${styles.section} ${styles.container}`}>
    <p className={styles.eyebrow}>Pour les commerces locaux</p><h2 id="sectors-title" className={`${styles.heading} mt-4`}>Votre activité. Vos clients. Votre jeu.</h2>
    <p className={styles.intro}>Des animations et des récompenses à adapter à chaque établissement.</p>
    <div className={styles.sectorGrid}>{sectors.map(sector => <article key={sector.title} className={styles.sectorCard}>
      <div className={styles.sectorArt}><Image src={sector.image} alt={`Extrait de la démo interactive ${sector.title}, enseigne fictive`} sizes="(min-width: 768px) 180px, 110px" className={styles.sectorPhone} /></div><div className={styles.sectorCopy}><h3>{sector.title}</h3><p>{sector.text}</p>
        <PrimaryButton href={sector.href} trackingName="explore_sector" trackingLocation="sectors" appearance="text" trackingVariant={sector.variant}>{sector.action}</PrimaryButton>
      </div>
    </article>)}</div>
    <p className={`${styles.note} mt-5`}>Extraits de la démonstration interactive. Enseignes et lots fictifs ; les conditions sont définies par l’établissement.</p>
    <div className={styles.inStore}>
      <figure><Image src={counter} alt="Mise en situation illustrative d’une affiche de jeu sur le comptoir d’un restaurant" sizes="(min-width: 768px) 460px, 100vw" /><figcaption>Mise en situation illustrative, sans établissement client représenté.</figcaption></figure>
      <div><p className={styles.eyebrow}>Dans votre établissement</p><h3>Un QR sur le comptoir.<br />Une raison de revenir.</h3>
        <ol><li><strong>01 · Affichez votre jeu</strong><span>Personnalisez votre affiche dans Okado, puis imprimez-la en A4 ou A5.</span></li><li><strong>02 · Vos clients jouent</strong><span>Le QR ouvre le jeu dans le navigateur du téléphone, sans application à installer.</span></li><li><strong>03 · Remettez les cadeaux</strong><span>Le gagnant présente son QR de retrait. Votre équipe vérifie les conditions et valide la remise avec son PIN.</span></li></ol>
        <Link href="/affiches-qr-code" className={styles.link}>Découvrir les affiches et QR <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </div>
  </section>;
}

export function CompactTracking() {
  return <section id="suivi" aria-labelledby="tracking-title" className={`${styles.section} ${styles.tracking}`}>
    <div className={`${styles.container} ${styles.trackingGrid}`}>
      <div><p className={styles.eyebrow}>Votre espace marchand</p><h2 id="tracking-title" className={`${styles.heading} mt-4`}>Vos jeux, vos gains.<br />Vous gardez la main.</h2><p className={styles.intro}>Retrouvez vos jeux et leurs participations. Consultez les gains attribués et les retraits validés, puis ajustez vos lots pour les prochaines parties.</p>
        <Link href="/comment-ca-marche" className={styles.link}>Découvrir le suivi des gains <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <figure className={styles.dashboardFigure}><a href={dashboard.src} target="_blank" rel="noreferrer" aria-label="Agrandir la capture du tableau de bord marchand"><Image src={dashboard} alt="Tableau de bord Okado : indicateurs et tableau de trois jeux avec scans, participations et conversion" sizes="(min-width: 768px) 680px, 100vw" /></a><figcaption>Vraie interface Okado · données fictives · <a href={dashboard.src} target="_blank" rel="noreferrer">Agrandir la capture</a></figcaption></figure>
    </div>
    <dl className={`${styles.container} ${styles.trackingLabels}`}><div><dt>Participations</dt><dd>Les parties effectivement commencées.</dd></div><div><dt>Gains attribués</dt><dd>Les cadeaux remportés par vos clients.</dd></div><div><dt>Lots récupérés</dt><dd>Les retraits validés par votre équipe.</dd></div></dl>
    <p className={`${styles.container} ${styles.note} mt-7`}>Un retrait confirme l’utilisation d’un gain. Il ne prouve pas, à lui seul, une vente supplémentaire. <Link href="/aide/notifications-et-relances" className="underline underline-offset-4">En savoir plus sur les notifications.</Link></p>
  </section>;
}
