"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Expand, X } from "lucide-react";
import { gameModels, type GameModel } from "@/lib/marketing-examples";
import { captureMarketingEvent } from "@/lib/marketing-analytics";
import { GamePreview } from "./game-preview";
import styles from "./showcase.module.css";

export function TemplateGallery() {
  const carousel = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<GameModel | null>(null);
  const id = useId();

  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
  }, [selected]);

  function scroll(direction: number) {
    const element = carousel.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return (
    <section id="modeles" aria-labelledby={`${id}-title`} className={`${styles.container} ${styles.section}`}>
      <div className={styles.sectionTop}>
        <div><p className={styles.eyebrow}>Les modèles Okado</p><h2 id={`${id}-title`} className={styles.heading}>Un jeu qui ressemble<br />à votre établissement.</h2></div>
        <div className={styles.carouselControls}>
          <button type="button" aria-label="Modèles précédents" aria-controls={`${id}-models`} onClick={() => scroll(-1)}><ArrowLeft size={18} aria-hidden="true" /></button>
          <button type="button" aria-label="Modèles suivants" aria-controls={`${id}-models`} onClick={() => scroll(1)}><ArrowRight size={18} aria-hidden="true" /></button>
        </div>
      </div>
      <p className={styles.intro}>Choisissez un univers graphique. Ajoutez votre logo, vos textes et vos lots. Roue ou ticket à gratter, la surprise porte votre signature.</p>
      <div ref={carousel} id={`${id}-models`} className={styles.carousel} role="region" aria-label="Galerie des modèles de jeux" tabIndex={0}>
        {gameModels.map(model => <article key={model.id} className={styles.modelCard}>
          <button type="button" className={styles.modelButton} aria-label={`Voir le modèle ${model.name} — ${model.type}`} onClick={event => {
            opener.current = event.currentTarget;
            setSelected(model);
            captureMarketingEvent("marketing_cta_clicked", { cta: "model_preview", location: "models", variant: model.id, destination: "#modeles" });
          }}>
            <div className={styles.modelArt}><GamePreview model={model} /></div>
            <div className={styles.modelCopy}><strong>{model.name}</strong><span>{model.type}</span><Expand size={17} aria-hidden="true" /></div>
          </button>
        </article>)}
      </div>
      <p className={styles.note}>Une sélection de la collection Beauté, avec enseigne et lots fictifs. D’autres modèles sont disponibles pour les autres activités. Les options de couleur et de fond varient selon le modèle.</p>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-dialog-title`}
        onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}
        onClose={() => { setSelected(null); opener.current?.focus({ preventScroll: true }); }}>
        <div className={styles.dialogTop}><h3 id={`${id}-dialog-title`}>{selected?.name}</h3><button type="button" aria-label="Fermer l’aperçu du modèle" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button></div>
        {selected ? <><div className={styles.dialogArt}><GamePreview model={selected} eager /></div><p className={styles.note}>{selected.type} · Exemple fictif. Logo, textes et lots personnalisables ; les options de couleur et de fond dépendent du modèle.</p></> : null}
      </dialog>
    </section>
  );
}
