"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";
import { beautySpecialties } from "@/lib/marketing-examples";
import { captureMarketingEvent } from "@/lib/marketing-analytics";
import { GamePreview } from "./game-preview";
import { PrimaryButton } from "./primary-button";
import styles from "./showcase.module.css";

export function BeautyUseCases() {
  const [active, setActive] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();
  function select(index: number, focus = false) {
    setActive(index);
    if (focus) {
      tabs.current[index]?.focus({ preventScroll: true });
      tabs.current[index]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    }
    captureMarketingEvent("marketing_cta_clicked", { cta: "select_specialty", location: "beauty_examples", variant: beautySpecialties[index].id, destination: "#exemples-metiers" });
  }
  return <section id="exemples-metiers" aria-labelledby={`${id}-title`} className={`${styles.container} ${styles.section}`}>
    <p className={styles.eyebrow}>Des idées adaptées à vos prestations</p><h2 id={`${id}-title`} className={`${styles.heading} mt-4`}>Des idées pour chaque spécialité beauté.</h2>
    <p className={styles.intro}>Choisissez votre univers, puis adaptez les lots et leurs conditions à votre carte. Le modèle reste personnalisable, quelle que soit votre spécialité.</p>
    <div className={styles.tabs} role="tablist" aria-label="Spécialités beauté">
      {beautySpecialties.map((specialty, index) => <button key={specialty.id} ref={element => { tabs.current[index] = element; }} type="button"
        role="tab" id={`${id}-tab-${index}`} aria-selected={index === active} aria-controls={`${id}-panel-${index}`} tabIndex={index === active ? 0 : -1}
        onClick={() => select(index)} onKeyDown={event => {
          const target = event.key === "ArrowRight" ? (index + 1) % beautySpecialties.length : event.key === "ArrowLeft" ? (index - 1 + beautySpecialties.length) % beautySpecialties.length : event.key === "Home" ? 0 : event.key === "End" ? beautySpecialties.length - 1 : null;
          if (target !== null) { event.preventDefault(); select(target, true); }
        }}>{specialty.label}</button>)}
    </div>
    <div id="lots" className="scroll-mt-36">{beautySpecialties.map((specialty, index) => <div key={specialty.id} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`}
      hidden={index !== active} tabIndex={0} className={styles.specialtyPanel} data-testid="beauty-use-case">
      <div className={styles.specialtyArt}><GamePreview model={specialty.model} /></div>
      <div><h3>{specialty.title}</h3><ul className={styles.rewardList}>{specialty.rewards.map(reward => <li key={reward}><Gift aria-hidden="true" />{reward}</li>)}</ul><p>{specialty.condition}</p><p className={styles.note}>Modèle {specialty.model.name} · {specialty.model.type}. Exemple fictif, à personnaliser.</p>
        <PrimaryButton href={`#demo-${specialty.id}`} trackingName="sector_demo" trackingLocation="beauty_examples" trackingVariant={specialty.id} appearance="text">Essayer cet exemple</PrimaryButton>
      </div>
    </div>)}</div>
    <p className={`${styles.note} mt-5`}>Exemples fictifs, à adapter à votre activité. La démo reprend un lot de la spécialité choisie dans un parcours beauté commun ; la galerie montre les modèles réels.</p>
    <Link href="/guides/lots-institut-beaute" className={`${styles.link} mt-3`}>Choisir des lots et leurs conditions <ArrowRight size={16} aria-hidden="true" /></Link>
  </section>;
}
