"use client";

import { useEffect, useRef, useState } from "react";
import { BadgePercent, Check, ChevronLeft, CirclePlus, Coffee, Gift, Loader2, Plus, Soup, Sparkles, UtensilsCrossed, X } from "lucide-react";
import { DialogShell } from "@/components/ui/dialog";
import type { PrizeSuggestion } from "@/lib/types";
import styles from "./wizard-prize-library.module.css";

const icons = { coffee: Coffee, dessert: Sparkles, drink: Soup, discount: BadgePercent, supplement: CirclePlus, menu: UtensilsCrossed, gift: Gift };
const percent = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);

export function WizardPrizeLibrary({ suggestions, addedIds, remainingProbability, activityLabel, isLoading, error, onRetry, onAdd, onClose }: {
  suggestions: PrizeSuggestion[];
  addedIds: ReadonlySet<string>;
  remainingProbability: number;
  activityLabel?: string;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onAdd: (suggestion: PrizeSuggestion, probability: number) => void;
  onClose: () => void;
}) {
  const [adjustment, setAdjustment] = useState<{ suggestion: PrizeSuggestion; probability: number } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const originRef = useRef<{ id: string; scrollTop: number } | null>(null);
  const focusFrame = useRef<number | null>(null);
  const projectedTotal = 100 - remainingProbability + (adjustment?.probability ?? 0);

  useEffect(() => () => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
  }, []);

  function restoreCatalogFocus(id: string, added: boolean) {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      const content = contentRef.current;
      if (!content) return;
      if (originRef.current?.id === id) content.scrollTop = originRef.current.scrollTop;
      const buttons = Array.from(content.querySelectorAll<HTMLButtonElement>("[data-prize-add]"));
      const index = buttons.findIndex((button) => button.dataset.suggestionId === id);
      const bounds = content.getBoundingClientRect();
      const target = added ? buttons.slice(index + 1).find((button) => {
        const rect = button.getBoundingClientRect();
        return !button.disabled && rect.top >= bounds.top && rect.bottom <= bounds.bottom;
      }) : buttons[index];
      (target ?? doneRef.current)?.focus({ preventScroll: true });
      if (!added) target?.scrollIntoView({ block: "nearest" });
      focusFrame.current = null;
    });
  }

  function cancelAdjustment() {
    if (!adjustment) return;
    const id = adjustment.suggestion.id;
    setAdjustment(null);
    setValidationError(null);
    restoreCatalogFocus(id, false);
  }

  function add(suggestion: PrizeSuggestion, probability: number) {
    if (addedIds.has(suggestion.id)) return;
    if (!suggestion.label.trim() || !Number.isFinite(probability) || probability < 0 || probability > 100
      || !Number.isFinite(suggestion.estimatedUnitCost) || suggestion.estimatedUnitCost < 0) {
      setValidationError("Vérifiez les informations de ce lot : un nom, une chance entre 0 et 100 % et un coût positif ou nul sont nécessaires.");
      return;
    }
    onAdd(suggestion, probability);
    setAdjustment(null);
    setValidationError(null);
    setLastAdded(`${suggestion.label} ajouté à votre composition.`);
    restoreCatalogFocus(suggestion.id, true);
  }

  function requestAdd(suggestion: PrizeSuggestion) {
    originRef.current = { id: suggestion.id, scrollTop: contentRef.current?.scrollTop ?? 0 };
    setValidationError(null);
    if (suggestion.probability > remainingProbability + 0.0001) {
      setAdjustment({ suggestion, probability: suggestion.probability });
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
      focusFrame.current = requestAnimationFrame(() => {
        if (contentRef.current) contentRef.current.scrollTop = 0;
        focusFrame.current = null;
      });
    } else {
      add(suggestion, suggestion.probability);
    }
  }

  return (
    <DialogShell open onClose={onClose} labelledBy="wizard-prize-library-title" describedBy="wizard-prize-library-description" className={styles.prizeLibrarySurface}>
      <header className={`${styles.libraryHeader} flex items-start justify-between gap-4`}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#716b78]">Idées pour votre activité</p>
          <h2 id="wizard-prize-library-title" className="mt-1 text-xl font-semibold text-[#242126]">Ajouter des lots</h2>
          <p id="wizard-prize-library-description" className="mt-1 text-sm leading-5 text-[#716b78]">Ajoutez vos idées, puis personnalisez-les dans votre composition.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer la bibliothèque de lots" className="okado-dialog-dismiss"><X className="size-4" aria-hidden="true" /></button>
      </header>
      <div ref={contentRef} className={styles.libraryContent} data-testid="wizard-prize-library-content">
        {adjustment ? (
          <section aria-labelledby="wizard-suggestion-adjustment-title" className="mx-auto max-w-xl space-y-4">
            <button type="button" onClick={cancelAdjustment} className="inline-flex items-center gap-1 text-sm font-semibold text-[#64206f]"><ChevronLeft className="size-4" aria-hidden="true" />Retour aux suggestions</button>
            <div>
              <h3 id="wizard-suggestion-adjustment-title" className="text-lg font-semibold text-[#242126]">Ajustez la chance de ce lot</h3>
              <p className="mt-1 text-sm font-semibold text-[#64206f]">{adjustment.suggestion.label}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block text-sm font-semibold text-[#242126]">
                Chance de gain pour ce lot (%)
                <input autoFocus type="number" min={0} max={100} step="any" value={adjustment.probability}
                  onChange={(event) => { setAdjustment({ ...adjustment, probability: Number(event.target.value || 0) }); setValidationError(null); }}
                  className="mt-2 block w-full rounded-[10px] border border-[#e8e2ea] bg-white px-3 py-3 text-sm outline-none focus:border-[#64206f] focus:ring-2 focus:ring-[#64206f]/15" />
              </label>
              {remainingProbability > 0 ? <button type="button" onClick={() => add(adjustment.suggestion, remainingProbability)} className="okado-secondary-action px-3 text-[13px]">Ajouter avec les {percent(remainingProbability)} % disponibles</button> : null}
            </div>
            <p className="text-sm leading-6 text-[#716b78]">La suggestion propose {percent(adjustment.suggestion.probability)} %, alors que {percent(Math.max(0, remainingProbability))} % restent disponibles. Les chances des autres lots restent inchangées.</p>
            {remainingProbability <= 0 ? <p className="rounded-[10px] bg-[#f6f0fa] p-3 text-sm leading-5 text-[#64206f]">Toutes les chances sont déjà réparties. Vous pouvez préparer ce lot, mais vous devrez réduire les chances des autres lots dans la composition avant d’enregistrer le jeu.</p> : null}
          </section>
        ) : isLoading ? (
          <p role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-[#716b78]"><Loader2 className="size-5 animate-spin" aria-hidden="true" />Chargement des suggestions…</p>
        ) : error ? (
          <div className="rounded-[12px] border border-[#f1c8c6] bg-[#fff6f5] p-5">
            <p role="alert" className="text-sm leading-6 text-[#b42318]">{error}</p>
            <button type="button" onClick={onRetry} className="okado-secondary-action mt-3 px-4 text-sm">Réessayer</button>
          </div>
        ) : !suggestions.length ? (
          <div className="rounded-[12px] border border-dashed border-[#e8e2ea] px-5 py-8 text-center">
            <Gift className="mx-auto size-7 text-[#8c5b98]" aria-hidden="true" />
            <h3 className="mt-3 font-semibold text-[#242126]">Aucune suggestion pour cette activité</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#716b78]">Vous pouvez créer votre propre lot depuis la composition. Son nom, sa chance et ses conditions restent entièrement personnalisables.</p>
            <button type="button" onClick={onClose} className="okado-secondary-action mt-4 px-4 text-sm">Retour à ma composition</button>
          </div>
        ) : (
          <section aria-labelledby="wizard-prize-suggestions-title">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 id="wizard-prize-suggestions-title" className="text-sm font-semibold text-[#242126]">Suggestions</h3>
                {activityLabel ? <p className="mt-1 text-[13px] leading-5 text-[#716b78]">Activité : {activityLabel}</p> : null}
              </div>
              <span className="text-[13px] text-[#716b78]">{suggestions.length} idées pour votre activité</span>
            </div>
            <p className="mb-4 text-[13px] leading-5 text-[#716b78]">Coûts indicatifs, à adapter à votre établissement : estimez votre coût réel, pas la valeur du cadeau pour le client.</p>
            <div className={styles.libraryGrid}>
              {suggestions.map((suggestion) => {
                const added = addedIds.has(suggestion.id);
                const Icon = icons[suggestion.icon as keyof typeof icons] ?? Gift;
                return (
                  <article key={suggestion.id} data-testid="wizard-prize-suggestion-card" data-added={added} className={styles.libraryCard}>
                    <div className="flex items-start gap-3">
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${added ? "bg-[#e4f1e9] text-[#25845b]" : "bg-[#f6f0fa] text-[#64206f]"}`}><Icon className="size-4" aria-hidden="true" /></span>
                      <div className="min-w-0">
                        <h4 className="break-words text-sm font-semibold leading-5 text-[#242126]">{suggestion.label}</h4>
                        <p className="mt-1 break-words text-[13px] leading-5 text-[#716b78]">{suggestion.description}</p>
                      </div>
                    </div>
                    <div className={styles.libraryCardBottom}>
                      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[#716b78]">
                        <div><dt>Chance suggérée</dt><dd className="mt-1 font-semibold tabular-nums text-[#242126]">{percent(suggestion.probability)} %</dd></div>
                        <div><dt>Coût estimé</dt><dd className="mt-1 font-semibold tabular-nums text-[#242126]">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(suggestion.estimatedUnitCost)}</dd></div>
                      </dl>
                      <button data-prize-add data-suggestion-id={suggestion.id} type="button" disabled={added} aria-label={`${added ? "Ajouté" : "Ajouter"} : ${suggestion.label}`} onClick={() => requestAdd(suggestion)}
                        className={`inline-flex min-h-10 items-center gap-1.5 rounded-[8px] px-3 py-2 text-[13px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#64206f] ${added ? "bg-[#e4f1e9] text-[#25845b]" : "bg-[#f6f0fa] text-[#64206f] hover:bg-[#eee2f4]"}`}>
                        {added ? <Check className="size-3.5" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}{added ? "Ajouté" : "Ajouter"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        <p role="status" className="sr-only">{lastAdded}</p>
      </div>
      <footer className={`${styles.libraryFooter} space-y-3`}>
        {validationError ? <p role="alert" className="rounded-[10px] bg-[#fff6f5] px-3 py-3 text-sm leading-5 text-[#b42318]">{validationError}</p>
          : projectedTotal > 100.0001 ? <p role="alert" className="rounded-[10px] border border-[#f1c8c6] bg-[#fff6f5] px-3 py-3 text-sm leading-5 text-[#b42318]">Les probabilités dépassent 100 % de {percent(projectedTotal - 100)} points. Vous pourrez ajuster les chances dans la composition avant d’enregistrer le jeu.</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[13px] leading-5 text-[#716b78]">
            <p>{addedIds.size} suggestion{addedIds.size > 1 ? "s" : ""} ajoutée{addedIds.size > 1 ? "s" : ""}</p>
            <p>Chances restantes à répartir : <strong className="font-semibold text-[#242126]">{percent(Math.max(0, remainingProbability))} %</strong></p>
          </div>
          <div className="flex flex-wrap gap-2">
            {adjustment ? <>
              <button type="button" onClick={cancelAdjustment} className="okado-secondary-action px-3 text-[13px]">Annuler l’ajout</button>
              <button type="button" onClick={() => add(adjustment.suggestion, adjustment.probability)} className="okado-filled-action px-4 text-sm">Ajouter le lot</button>
            </> : <button ref={doneRef} type="button" onClick={onClose} className="okado-filled-action px-4 text-sm">Terminer</button>}
          </div>
        </div>
      </footer>
    </DialogShell>
  );
}
