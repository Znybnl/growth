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
      <p>
        Dans un jeu réel, le lien ouvre Google. Cet écran simplifié reste dans
        la démo : aucun compte connecté, aucun avis publié.
      </p>
      <fieldset className={styles.rating} aria-describedby={`${id}-notice`}>
        <legend>Votre note de démonstration</legend>
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
        <p className={styles.ratingValue}>
          {rating
            ? `${rating} sur 5 · sélection fictive`
            : "Aucune note sélectionnée"}
        </p>
      </fieldset>
      <p id={`${id}-notice`} className={styles.reviewNotice}>
        Avec ou sans note, le jeu et le gain sont identiques. Rien n’est
        transmis à Google.
      </p>
      <button type="button" onClick={onContinue} className={styles.primary}>
        Revenir au jeu <ArrowRight size={16} aria-hidden="true" />
      </button>
      <p className={styles.noPublish}>Ce bouton ne publie pas d’avis.</p>
    </>
  );
}

export function DemoMailPreview({
  businessName,
  rewardLabel,
  onBack,
}: {
  businessName: string;
  rewardLabel: string;
  onBack: () => void;
}) {
  return (
    <>
      <p className={styles.mailNotice}>
        Aperçu fictif : aucun e-mail n’est envoyé.
      </p>
      <div className={styles.mailPreview}>
        <div className={styles.mailMeta}>
          <span>De : {businessName} · exemple</span>
          <span>À : camille@exemple.test</span>
        </div>
        <h4>Félicitations Camille&nbsp;!</h4>
        <p>
          Votre gain : <strong>{rewardLabel}</strong>
        </p>
        <p>
          Lors de votre prochaine visite, présentez votre QR de retrait à
          l’établissement.
        </p>
        <div className={styles.mockQr}>
          <QrCode size={64} aria-hidden="true" />
          <span>
            QR illustratif
            <br />
            Non utilisable
          </span>
        </div>
        <p className={styles.mailConditions}>
          Dans un jeu réel, les conditions et dates de validité définies par
          l’établissement figurent ici.
        </p>
      </div>
      <button type="button" onClick={onBack} className={styles.secondary}>
        <ArrowLeft size={16} aria-hidden="true" />
        Revenir à la confirmation
      </button>
    </>
  );
}
