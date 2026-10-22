"use client";

import { useEffect, useId, useRef } from "react";
import { ChevronLeft, Layers3 } from "lucide-react";
import type { PrizeComposition } from "@/lib/prize-compositions";
import styles from "./wizard-prize-library.module.css";

const percent = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
const euros = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);

export function WizardPrizeCompositions({ compositions, selected, confirming, winningEveryTime, onSelect, onBack }: {
  compositions: PrizeComposition[];
  selected: PrizeComposition | null;
  confirming: boolean;
  winningEveryTime: boolean;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const lastSelected = useRef<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const selectedId = selected?.id;
  useEffect(() => {
    if (selectedId) { lastSelected.current = selectedId; heading.current?.focus(); }
    else if (lastSelected.current) root.current?.querySelector<HTMLButtonElement>(`[data-composition="${lastSelected.current}"]`)?.focus();
  }, [selectedId, confirming]);

  return <div ref={root} className={styles.compositionContainer}>
    {selected ? <section aria-labelledby={`${id}-detail-title`} className="space-y-4">
      {!confirming ? <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-[#64206f]"><ChevronLeft className="size-4" aria-hidden="true" />Toutes les compositions</button> : null}
      <div>
        <h3 ref={heading} tabIndex={-1} id={`${id}-detail-title`} className="text-lg font-semibold outline-none">{confirming ? "Remplacer votre composition actuelle ?" : selected.name}</h3>
        <p className="mt-2 text-sm leading-6 text-[#716b78]">{confirming ? "Les lots actuellement configurés seront remplacés par ceux de cette composition." : selected.description}</p>
        {confirming ? <p className="mt-2 text-sm font-semibold text-[#64206f]">Composition choisie : {selected.name}</p> : null}
      </div>
      <CompositionMetrics composition={selected} />
      {winningEveryTime && selected.winningProbability < 100 ? <p className="rounded-lg bg-[#fff5e5] p-3 text-sm leading-5 text-[#714400]">Votre option « Jeu 100 % gagnant » reste activée. Après application, complétez les chances à 100 % avant de publier.</p> : null}
      <ul className="space-y-2" aria-label="Lots de la composition">
        {selected.prizes.map((item) => <li key={item.id} className="rounded-xl border border-[#e8e2ea] bg-white p-4">
          <div className="flex items-start justify-between gap-3"><h4 className="min-w-0 break-words text-sm font-semibold">{item.label}</h4><strong className="shrink-0 text-sm tabular-nums text-[#64206f]">{percent(item.probability)} %</strong></div>
          <p className="mt-1 break-words text-[13px] leading-5 text-[#716b78]">{item.description}</p>
          <p className="mt-2 text-[13px] text-[#716b78]">Coût unitaire indicatif : {euros(item.estimatedUnitCost)} · Stock illimité</p>
        </li>)}
      </ul>
      <p className="text-[13px] leading-5 text-[#716b78]">Coût moyen théorique par participation = somme des coûts unitaires × leurs chances de gain. Chances, coûts et conditions proposés à titre indicatif. Chaque lot reste modifiable après application. Aucun changement n’est enregistré avant la sauvegarde du jeu.</p>
    </section> : <section aria-labelledby={`${id}-list-title`}>
      <h3 id={`${id}-list-title`} className="text-sm font-semibold">Composez votre jeu en un choix</h3>
      <p className="mb-4 mt-2 text-[13px] leading-5 text-[#716b78]">Recettes adaptées à votre activité, issues de la bibliothèque. Offres et coûts indicatifs à vérifier avant publication.</p>
      {!compositions.length ? <p className="rounded-xl border border-dashed border-[#e8e2ea] p-5 text-sm leading-6 text-[#716b78]">Aucune composition disponible pour cette activité. Vous pouvez utiliser les suggestions ou créer vos propres lots.</p> : <div className={styles.compositionGrid}>{compositions.map((item) => <article key={item.id} data-testid="wizard-composition-card" data-recommended={item.id === "balanced" || undefined} className={styles.libraryCard}>
        <div className="flex flex-wrap items-center gap-2"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f6f0fa] text-[#64206f]"><Layers3 className="size-4" aria-hidden="true" /></span><h4 className="text-base font-semibold">{item.name}</h4>{item.id === "balanced" ? <span className="rounded-full bg-[#f6f0fa] px-2 py-1 text-[11px] font-semibold text-[#64206f]">Recommandé</span> : null}</div>
        <ul className="space-y-1 text-[13px] leading-5" aria-label={`Lots proposés : ${item.name}`}>{item.prizes.map((prize) => <li key={prize.id} className="break-words">{prize.label} · {percent(prize.probability)} %</li>)}</ul>
        <CompositionMetrics composition={item} compact />
        <div className="mt-auto flex justify-end"><button type="button" data-composition={item.id} onClick={() => onSelect(item.id)} aria-label={`Voir la composition : ${item.name}`} className="okado-secondary-action px-4 text-sm">Voir la composition</button></div>
      </article>)}</div>}
    </section>}
  </div>;
}

function CompositionMetrics({ composition, compact = false }: { composition: PrizeComposition; compact?: boolean }) {
  return <dl className={`grid grid-cols-2 rounded-lg bg-[#f6f0fa] p-3 ${compact ? "gap-2 text-xs leading-4" : "gap-3 text-[13px] sm:grid-cols-4"}`}>
    <div><dt className="text-[#716b78]">Lots</dt><dd className="mt-1 font-semibold">{composition.prizes.length}</dd></div>
    <div><dt className="text-[#716b78]">Chances de gagner</dt><dd className="mt-1 font-semibold tabular-nums">{percent(composition.winningProbability)} %</dd></div>
    <div><dt className="text-[#716b78]">Part perdante</dt><dd className="mt-1 font-semibold tabular-nums">{percent(composition.losingProbability)} %</dd></div>
    <div><dt className="text-[#716b78]">Coût / participation</dt><dd className="mt-1 font-semibold tabular-nums">{euros(composition.averageCost)}</dd></div>
  </dl>;
}
