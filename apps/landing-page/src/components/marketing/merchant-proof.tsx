import Link from "next/link";
import { ArrowRight, Bell, CalendarClock, Check, Mail } from "lucide-react";
import styles from "./product-proof.module.css";

/** Editorial examples only: no user data, provider call or live KPI. */
export function MerchantProof({ beauty = false }: { beauty?: boolean }) {
  const business = beauty ? "L’atelier beauté" : "Le bistro";
  const reward = beauty ? "Mini soin découverte" : "Dessert offert";
  return (
    <section id="suivi" aria-labelledby="merchant-proof-title" className={styles.section}>
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Après le jeu, le suivi continue</p>
        <h2 id="merchant-proof-title">Votre animation avance.<br />Vous restez informé.</h2>
        <p>Voyez quels cadeaux sont récupérés et quels stocks ajuster, même sans ouvrir votre tableau de bord.</p>
      </div>
      <div className={styles.followupGrid}>
        <div className={styles.followupCopy}>
          <span className={styles.icon}><Bell size={23} aria-hidden="true" /></span>
          <h3>Un bilan utile, directement dans votre boîte mail.</h3>
          <p>Recevez une alerte à chaque gain et/ou une synthèse quotidienne, hebdomadaire ou mensuelle. Vous choisissez les fréquences dans Mon compte.</p>
          <ul className={styles.checks}>
            <li><Check size={17} aria-hidden="true" />Les gains détaillés et leur état de retrait.</li>
            <li><Check size={17} aria-hidden="true" />Les retraits réalisés pendant la période.</li>
            <li><Check size={17} aria-hidden="true" />Les stocks à surveiller, dont les lots épuisés.</li>
          </ul>
          <Link href="/aide/notifications-et-relances" className={styles.link}>Choisir mes notifications <ArrowRight size={16} aria-hidden="true" /></Link>
          <p className={styles.note}>Notifications facultatives, désactivées par défaut. L’exemple n’est pas un résultat client.</p>
        </div>
        <figure className={styles.digest} data-testid="merchant-digest-example">
          <figcaption className={styles.mailCaption}><Mail size={16} aria-hidden="true" />Aperçu de synthèse · données fictives</figcaption>
          <div className={styles.mailBody}>
            <p className={styles.mailSubject}>{business} · Synthèse hebdomadaire</p>
            <h3>Les gains de la semaine</h3>
            <p className={styles.note}>Du 5 au 11 octobre 2026</p>
            <dl className={styles.digestKpis}>
              <div><dt>Gains attribués</dt><dd>3</dd></div>
              <div><dt>Lots récupérés sur la période</dt><dd>2</dd></div>
            </dl>
            <p className={styles.note}>Les 2 retraits incluent 1 gain d’une semaine précédente.</p>
            <div className={styles.tableViewport} tabIndex={0} role="region" aria-label="Détail fictif des gains de la semaine">
              <table className={styles.digestTable}>
                <caption className={styles.srOnly}>Jeu Découverte · trois gains fictifs</caption>
                <thead><tr><th scope="col">Participant / lot</th><th scope="col">Expiration ou retrait</th></tr></thead>
                <tbody>
                  <tr><td><strong>Camille Martin</strong><span>6 oct. · {reward}</span></td><td><span className={styles.redeemed}>Récupéré</span></td></tr>
                  <tr><td><strong>Alex Dubois</strong><span>8 oct. · Remise de 10 %</span></td><td>7 nov. 2026</td></tr>
                  <tr><td><strong>Lou Bernard</strong><span>10 oct. · {reward}</span></td><td>9 nov. 2026</td></tr>
                </tbody>
              </table>
            </div>
            <div className={styles.stockBox}>
              <p>Stocks des jeux actifs</p>
              <ul><li>{reward}<strong>4 disponibles</strong></li><li>Remise de 10 %<strong>Illimité</strong></li><li>Produit découverte<strong className={styles.exhausted}>Épuisé · 0</strong></li></ul>
            </div>
            <p className={styles.note}>Exemple simplifié. Les vrais e-mails reprennent vos jeux et vos gains. Préférences modifiables dans Mon compte.</p>
          </div>
        </figure>
      </div>
      <div className={styles.reminder} data-testid="customer-reminder-example">
        <div>
          <p className={styles.eyebrow}><CalendarClock size={17} aria-hidden="true" />Côté client · une autre option</p>
          <h3>Un cadeau non retiré ? Rappelez-le avant son expiration.</h3>
          <p>Activez la relance au niveau du compte et choisissez combien de jours avant l’expiration prévenir le gagnant. Ce n’est pas la synthèse que vous recevez.</p>
          <Link href="/aide/notifications-et-relances#section-3" className={styles.link}>Comprendre la relance client <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <aside className={styles.reminderMail}>
          <p className={styles.mailCaption}><Mail size={16} aria-hidden="true" />Exemple fictif · e-mail au gagnant</p>
          <h4>Alex, votre cadeau vous attend encore.</h4>
          <p>Votre remise de 10 % chez {business} est utilisable jusqu’au 7 novembre 2026. Retrouvez votre QR code et vos conditions dans votre e-mail de gain.</p>
        </aside>
        <p className={styles.reminderNote}>Désactivée par défaut · 7 jours proposés, délai personnalisable · gains non retirés éligibles, validité initiale d’au moins 20 jours · passage quotidien à horaire indicatif, sans rattrapage d’une journée passée.</p>
      </div>
    </section>
  );
}
