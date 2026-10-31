"use client";

import { useSyncExternalStore } from "react";
import { beautyDemoRewards, demoSectors, isBeautyDemoSpecialty, type DemoSector } from "@/lib/demo-examples";
import { captureMarketingEvent } from "@/lib/marketing-analytics";
import { LandingDemo } from "./landing-demo";
import styles from "./landing-demo.module.css";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

// Native fragment links preserve attribution and static rendering. Only known
// editorial IDs can change the simulation; nothing is saved or sent to an API.
export function DemoExplorer({ sector, compact = false }: { sector?: DemoSector; compact?: boolean }) {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "");
  const requested = hash.replace(/^#demo-/, "");
  const specialty = isBeautyDemoSpecialty(requested) && sector === "beauty" ? requested : undefined;
  const variant = specialty ? "beauty" : demoSectors.find(item => item.id === requested && (!sector || item.id === sector))?.id ?? sector ?? "restaurant";
  const selection = specialty ?? variant;
  const sectorChoices = !sector ? <nav className={styles.sectorChoices} aria-label="Activité de la démo">
    {demoSectors.map(item => <a key={item.id} href={`#demo-${item.id}`} aria-label={item.label} aria-current={variant === item.id ? "true" : undefined}
      onClick={() => captureMarketingEvent("marketing_cta_clicked", { cta: "select_demo_sector", location: "demo_selector", variant: item.id, destination: "/" })}><span className={styles.sectorFull}>{item.label}</span><span className={styles.sectorShort}>{item.id === "beauty" ? "Beauté" : item.id === "restaurant" ? "Restaurant" : "Boutique"}</span></a>)}
  </nav> : specialty ? <p className={styles.selectedSpecialty}>Exemple · {beautyDemoRewards[specialty].label} <a href="#demo-beauty">Revenir à la démo beauté générale</a></p> : null;

  return <div className={`${styles.explorer}${compact ? ` ${styles.explorerCompact}` : ""}`}>
    {(sector === "beauty" ? ["beauty", ...Object.keys(beautyDemoRewards)] : demoSectors.map(item => item.id)).map(id =>
      <span key={id} id={`demo-${id}`} className={styles.anchor} aria-hidden="true" />)}
    {compact ? <div className={styles.compactToolbar}>
      <header className={styles.heading}><h2>Essayez le parcours de vos clients</h2></header>
      {sectorChoices}
    </div> : <>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Démo interactive</p>
        <h2>À vous de jouer.</h2>
        <p>Découvrez le parcours de vos clients, du jeu à l’e-mail de gain.</p>
      </header>
      {sectorChoices}
    </>}
    <LandingDemo key={selection} variant={variant} specialty={specialty} hideHeading />
  </div>;
}
