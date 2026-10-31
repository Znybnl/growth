"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Expand, X } from "lucide-react";
import { gameModels, homeGameModels, type GameModel } from "@/lib/marketing-examples";
import { captureMarketingEvent } from "@/lib/marketing-analytics";
import { GamePreview } from "./game-preview";
import styles from "./showcase.module.css";

export function TemplateGallery({ multisector = false }: { multisector?: boolean }) {
  const models = multisector ? homeGameModels : gameModels;
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<GameModel | null>(null);
  const id = useId();

  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
  }, [selected]);

  return (
    <section id="modeles" aria-labelledby={`${id}-title`} className={`${styles.container} ${styles.section} ${styles.gallerySection}`}>
      <div className={styles.sectionTop}>
        <div><p className={styles.eyebrow}>Les modèles Okado</p><h2 id={`${id}-title`} className={styles.heading}>Un jeu qui ressemble<br className={styles.modelTitleBreak} /> à votre établissement.</h2></div>
      </div>
      <p className={styles.intro}>Choisissez un univers graphique. Ajoutez votre logo, vos textes et vos lots. Roue ou ticket à gratter, la surprise porte votre signature.</p>
      <div id={`${id}-models`} className={styles.modelGrid} role="region" aria-label="Galerie des modèles de jeux">
        {models.map(model => <article key={model.id} className={styles.modelCard}>
          <button type="button" className={styles.modelButton} aria-label={`Voir le modèle ${model.name} — ${model.type}`} onClick={event => {
            opener.current = event.currentTarget;
            setSelected(model);
            captureMarketingEvent("marketing_cta_clicked", { cta: "model_preview", location: "models", variant: model.id, destination: "#modeles" });
          }}>
            <div className={styles.modelArt}><GamePreview model={model} sizes="(min-width: 1200px) 116px, (min-width: 768px) 164px, (min-width: 360px) 116px, 96px" /></div>
            <div className={styles.modelCopy}><strong>{model.name}</strong><span>{model.type}</span><small>Agrandir</small><Expand size={17} aria-hidden="true" /></div>
          </button>
        </article>)}
      </div>
      <p className={styles.note}>{multisector ? "Des univers Beauté, restaurant et fêtes de saison, avec enseignes et lots fictifs." : "Une sélection de la collection Beauté, avec enseigne et lots fictifs. D’autres modèles sont disponibles pour les autres activités."} Sélectionnez un modèle pour l’agrandir. Les options de couleur et de fond varient selon le modèle.</p>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-dialog-title`}
        onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}
        onClose={() => { setSelected(null); opener.current?.focus({ preventScroll: true }); }}>
        <div className={styles.dialogTop}><h3 id={`${id}-dialog-title`}>{selected?.name}</h3><button type="button" aria-label="Fermer l’aperçu du modèle" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button></div>
        {selected ? <><div className={styles.dialogArt}><GamePreview model={selected} eager sizes="228px" /></div><p className={styles.note}>{selected.type} · Exemple fictif. Logo, textes et lots personnalisables ; les options de couleur et de fond dépendent du modèle.</p></> : null}
      </dialog>
    </section>
  );
}
