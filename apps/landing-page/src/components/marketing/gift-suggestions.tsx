"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Gift, SlidersHorizontal } from "lucide-react";
import { demoSectors, type DemoSector } from "@/lib/demo-examples";
import { captureMarketingEvent } from "@/lib/marketing-analytics";
import { PrimaryButton } from "./primary-button";
import styles from "./showcase.module.css";

type Suggestion = { name: string; condition: string; probability?: string; cost?: string };
const examples: Record<DemoSector, { title: string; note: string; guide?: string; suggestions: Suggestion[] }> = {
  beauty: {
    title: "Ongles",
    note: "Extraits de la bibliothèque Beauté. Coûts estimés et probabilités individuels, indicatifs et modifiables ; ils ne constituent pas un jeu complet.",
    guide: "/guides/lots-institut-beaute",
    suggestions: [
      { name: "French offerte", probability: "15 %", cost: "3 €", condition: "Avec une pose payante." },
      { name: "Nail art offert", probability: "15 %", cost: "2 €", condition: "Jusqu’à 2 ongles, avec une pose payante." },
      { name: "Pose offerte", probability: "3 %", cost: "15 €", condition: "Pose semi-permanente mains, couleur unie." },
    ],
  },
  restaurant: {
    title: "Restaurants & cafés",
    note: "Idées illustratives à saisir dans votre jeu. Vous définissez les coûts, probabilités, stocks et conditions selon votre carte.",
    guide: "/guides/lots-restaurant",
    suggestions: [
      { name: "Dessert offert", condition: "Exemple : avec un repas lors d’une prochaine visite." },
      { name: "Café offert", condition: "Exemple : un café de votre sélection, à présenter au comptoir." },
      { name: "Avantage sur un prochain repas", condition: "Exemple : remise à définir, hors menus et offres en cours." },
    ],
  },
  retail: {
    title: "Boutiques & commerces",
    note: "Idées illustratives à saisir dans votre jeu. Vous choisissez les produits, leurs coûts, leurs stocks et leurs conditions ; ce n’est pas un catalogue automatique.",
    suggestions: [
      { name: "Produit découverte", condition: "Exemple : un produit de votre sélection, dans la limite du stock prévu." },
      { name: "Petit cadeau avec un achat", condition: "Exemple : un accessoire offert lors d’un prochain achat." },
      { name: "Remise sur une prochaine visite", condition: "Exemple : montant et minimum d’achat à définir par votre boutique." },
    ],
  },
};

export function GiftSuggestions() {
  const [sector, setSector] = useState<DemoSector>("beauty");
  const example = examples[sector];
  return <section id="fonctionnalites" aria-labelledby="gift-title" className={`${styles.gifts} ${styles.section}`}>
    <div className={`${styles.container} ${styles.giftGrid}`}>
      <div><p className={styles.eyebrow}>Des lots adaptés à votre activité</p><h2 id="gift-title" className={styles.heading}>Pas d’idée de cadeau ?<br />On vous aide.</h2>
        <p className={styles.intro}>Un soin, un dessert ou un produit découverte : choisissez un cadeau qui a du sens pour vos clients et pour votre établissement.</p>
        <ul className={styles.giftList}>
          <li><Gift aria-hidden="true" /><strong>Des exemples concrets</strong><p>Des idées pour votre métier, à adapter à votre offre.</p></li>
          <li><SlidersHorizontal aria-hidden="true" /><strong>Vous gardez le dernier mot</strong><p>Coûts estimés, probabilités, stocks et conditions : vous choisissez vos réglages.</p></li>
          <li><Check aria-hidden="true" /><strong>Un cadeau, des conditions claires</strong><p>Indiquez quand et comment votre client peut en profiter.</p></li>
        </ul>
      </div>
      <div className={styles.library}>
        <div className={styles.giftChoices} role="group" aria-label="Activité des exemples de lots">
          {demoSectors.map(item => <button key={item.id} type="button" aria-pressed={sector === item.id} onClick={() => {
            setSector(item.id);
            captureMarketingEvent("marketing_cta_clicked", { cta: "select_gift_sector", location: "gift_suggestions", variant: item.id, destination: "/" });
          }}>{item.id === "beauty" ? "Beauté" : item.id === "restaurant" ? "Restaurant" : "Commerce"}</button>)}
        </div>
        <div aria-live="polite" aria-atomic="true">
          <h3 className={styles.libraryHeader}><strong>Quelques idées</strong><span>{example.title}</span></h3>
          {example.suggestions.map(item => <div key={item.name} className={styles.suggestion}><div className={styles.suggestionHead}><strong>{item.name}</strong>{item.probability ? <span>{item.probability}</span> : null}</div><p>{item.condition}{item.cost ? <><br />Coût estimé pour l’établissement : {item.cost}.</> : null}</p></div>)}
          <p className={`${styles.note} mt-4`}>{example.note}</p>
        </div>
        <PrimaryButton href={`#demo-${sector}`} trackingName="sector_demo" trackingLocation="gift_suggestions" trackingVariant={sector} appearance="text">Essayer cet univers</PrimaryButton>
        {example.guide ? <Link href={example.guide} className={styles.giftGuide}>Choisir les lots et leurs conditions <ArrowRight size={14} aria-hidden="true" /></Link> : null}
      </div>
    </div>
  </section>;
}
