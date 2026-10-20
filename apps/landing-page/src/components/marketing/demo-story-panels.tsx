import { ArrowLeft, ArrowRight, QrCode, Star } from "lucide-react";
import { useId } from "react";
import styles from "./landing-demo.module.css";

// Both panels are local simulations inside LandingDemo's client boundary.
// A rating is never sent, persisted, or used to determine the illustrated gain.
export function DemoReview({
  rating,
  onRatingChange,
  onContinue,
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
  onContinue: () => void;
}) {
  const id = useId();
  return (
    <>
      <fieldset className={styles.rating}>
        <legend className={styles.srOnly}>Votre note</legend>
        <div className={styles.ratingOptions}>
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className={styles.ratingOption}>
              <input
                className={styles.ratingInput}
                type="radio"
                name={`${id}-rating`}
                value={value}
                checked={rating === value}
                onChange={() => onRatingChange(value)}
              />
              <span className={styles.srOnly}>
                {value} {value === 1 ? "étoile" : "étoiles"}
              </span>
              <Star
                size={29}
                aria-hidden="true"
                fill={rating >= value ? "currentColor" : "none"}
              />
            </label>
          ))}
        </div>
      </fieldset>
      <button type="button" onClick={onContinue} className={styles.primary}>
        Revenir au jeu <ArrowRight size={16} aria-hidden="true" />
      </button>
    </>
  );
}

export function DemoRedemption({ beauty = true }: { beauty?: boolean }) {
  return (
    <div className={styles.mockQr} data-testid="demo-redemption-qr">
      <QrCode size={72} aria-hidden="true" />
      <p>Présentez ce QR code lors de votre {beauty ? "rendez-vous" : "prochaine visite"}.</p>
    </div>
  );
}

export function DemoMailPreview({
  businessName,
  rewardLabel,
  beauty,
  onBack,
}: {
  businessName: string;
  rewardLabel: string;
  beauty?: boolean;
  onBack: () => void;
}) {
  return (
    <>
      <div className={styles.mailPreview}>
        <div className={styles.mailMeta}>
          <span>De : {businessName}</span>
          <span>À : camille@exemple.test</span>
        </div>
        <h4>Félicitations Camille&nbsp;!</h4>
        <p>
          Votre gain : <strong>{rewardLabel}</strong>
        </p>
        <DemoRedemption beauty={beauty} />
      </div>
      <button type="button" onClick={onBack} className={styles.secondary}>
        <ArrowLeft size={16} aria-hidden="true" />
        Revenir à la confirmation
      </button>
    </>
  );
}
