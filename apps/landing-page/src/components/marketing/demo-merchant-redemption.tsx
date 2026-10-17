import { CheckCircle2, ShieldCheck } from "lucide-react";
import styles from "./product-proof.module.css";

/** Local visual state supplied by LandingDemo; never calls the redemption API. */
export function DemoMerchantRedemption({ rewardLabel, redeemed, onConfirm }: {
  rewardLabel: string; redeemed: boolean; onConfirm: () => void;
}) {
  return (
    <section className={styles.redemption} aria-label="Démonstration du retrait côté commerce" data-testid="merchant-redemption-demo">
      <p className={styles.eyebrow}><ShieldCheck size={16} aria-hidden="true" />Du gain au retrait</p>
      <h4>Le cadeau est présenté.<br />Vous validez sa remise.</h4>
      <dl><div><dt>Lot de l’exemple</dt><dd>{rewardLabel}</dd></div><div><dt>Conditions</dt><dd>Une seule utilisation, du 16 octobre au 15 novembre 2026.</dd></div></dl>
      <button type="button" onClick={onConfirm} disabled={redeemed} className={styles.confirmRedemption}>
        {redeemed ? <><CheckCircle2 size={17} aria-hidden="true" />Retrait validé</> : "Simuler la validation par PIN"}
      </button>
      <p role="status" className={styles.redemptionStatus}>{redeemed ? "Lot déjà retiré le 16 octobre 2026 à 14:30. Une seconde validation est bloquée." : "Dans le jeu réel, le personnel vérifie les conditions et confirme avec le PIN de l’établissement."}</p>
      <p className={styles.note}>Simulation locale indépendante des compteurs ci-dessus. Aucun gain réel modifié.</p>
    </section>
  );
}
