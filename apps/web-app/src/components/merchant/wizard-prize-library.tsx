"use client";

import { useRef, useState } from "react";
import { BadgePercent, Check, ChevronLeft, CirclePlus, Coffee, Gift, Loader2, Plus, Soup, Sparkles, UtensilsCrossed, X } from "lucide-react";
import { DialogShell } from "@/components/ui/dialog";
import type { PrizeSuggestion } from "@/lib/types";

const icons = { coffee: Coffee, dessert: Sparkles, drink: Soup, discount: BadgePercent, supplement: CirclePlus, menu: UtensilsCrossed, gift: Gift };
const percent = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);

export function WizardPrizeLibrary({ suggestions, addedIds, remainingProbability, isLoading, error, onRetry, onAdd, onClose }: {
  suggestions: PrizeSuggestion[];
  addedIds: ReadonlySet<string>;
  remainingProbability: number;
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
  const projectedTotal = 100 - remainingProbability + (adjustment?.probability ?? 0);

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
    requestAnimationFrame(() => {
      const next = contentRef.current?.querySelector<HTMLButtonElement>("[data-prize-add]:not(:disabled)");
      (next ?? doneRef.current)?.focus({ preventScroll: true });
    });
  }

  function requestAdd(suggestion: PrizeSuggestion) {
    setValidationError(null);
    if (suggestion.probability > remainingProbability + 0.0001) {
      setAdjustment({ suggestion, probability: suggestion.probability });
    } else {
      add(suggestion, suggestion.probability);
    }
  }

  return (
    <DialogShell open onClose={onClose} labelledBy="wizard-prize-library-title" describedBy="wizard-prize-library-description" className="okado-prize-library">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#eee8f0] px-5 py-5 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#716b78]">Votre bibliothèque de lots</p>
          <h2 id="wizard-prize-library-title" className="mt-1 text-xl font-semibold text-[#242126]">Ajouter des lots</h2>
          <p id="wizard-prize-library-description" className="mt-2 max-w-xl text-sm leading-5 text-[#716b78]">Choisissez des récompenses adaptées à votre activité. Ajoutez plusieurs idées, puis personnalisez-les dans votre composition.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer la bibliothèque de lots" className="okado-dialog-dismiss"><X className="size-4" aria-hidden="true" /></button>
      </header>
      <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6" data-testid="wizard-prize-library-content">
        {adjustment ? (
          <section aria-labelledby="wizard-suggestion-adjustment-title" className="mx-auto max-w-xl space-y-4">
            <button type="button" onClick={() => { setAdjustment(null); setValidationError(null); }} className="inline-flex items-center gap-1 text-sm font-semibold text-[#64206f]"><ChevronLeft className="size-4" aria-hidden="true" />Retour aux suggestions</button>
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
              {remainingProbability > 0 ? <button type="button" onClick={() => add(adjustment.suggestion, remainingProbability)} className="okado-secondary-action px-3 text-xs">Ajouter avec les {percent(remainingProbability)} % disponibles</button> : null}
            </div>
            <p className="text-sm leading-6 text-[#716b78]">La suggestion propose {percent(adjustment.suggestion.probability)} %, alors que {percent(Math.max(0, remainingProbability))} % restent disponibles. Les chances des autres lots restent inchangées.</p>
          </section>
        ) : isLoading ? (
          <p role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-[#716b78]"><Loader2 className="size-5 animate-spin" aria-hidden="true" />Chargement des suggestions…</p>
        ) : error ? (
          <div className="rounded-[12px] border border-[#f1c8c6] bg-[#fff6f5] p-5">
            <p role="alert" className="text-sm leading-6 text-[#b42318]">{error}</p>
            <button type="button" onClick={onRetry} className="okado-secondary-action mt-3 px-4 text-sm">Réessayer</button>
          </div>
        ) : !suggestions.length ? (
          <div className="rounded-[12px] border border-dashed border-[#e8e2ea] px-5 py-12 text-center">
            <Gift className="mx-auto size-7 text-[#8c5b98]" aria-hidden="true" />
            <h3 className="mt-3 font-semibold text-[#242126]">Aucune suggestion pour cette activité</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#716b78]">Vous pouvez créer votre propre lot depuis la composition. Son nom, sa chance et ses conditions restent entièrement personnalisables.</p>
            <button type="button" onClick={onClose} className="okado-secondary-action mt-4 px-4 text-sm">Retour à ma composition</button>
          </div>
        ) : (
          <section aria-labelledby="wizard-prize-suggestions-title">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 id="wizard-prize-suggestions-title" className="text-sm font-semibold text-[#242126]">Suggestions</h3>
              <span className="text-xs text-[#716b78]">{suggestions.length} idées pour votre activité</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {suggestions.map((suggestion) => {
                const added = addedIds.has(suggestion.id);
                const Icon = icons[suggestion.icon as keyof typeof icons] ?? Gift;
                return (
                  <article key={suggestion.id} data-testid="wizard-prize-suggestion-card" className={`flex min-w-0 flex-col rounded-[12px] border p-4 ${added ? "border-[#b6d6c6] bg-[#f7fbf8]" : "border-[#e8e2ea] bg-white"}`}>
                    <div className="flex items-start gap-3">
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${added ? "bg-[#e4f1e9] text-[#25845b]" : "bg-[#f6f0fa] text-[#64206f]"}`}><Icon className="size-4" aria-hidden="true" /></span>
                      <div className="min-w-0">
                        <h4 className="break-words text-sm font-semibold leading-5 text-[#242126]">{suggestion.label}</h4>
                        <p className="mt-1 break-words text-xs leading-5 text-[#716b78]">{suggestion.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#716b78]">
                      <span>Chance suggérée : <strong className="font-semibold text-[#242126]">{percent(suggestion.probability)} %</strong></span>
                      <span>Coût estimé : <strong className="font-semibold text-[#242126]">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(suggestion.estimatedUnitCost)}</strong></span>
                    </div>
                    <div className="mt-auto flex justify-end pt-4">
                      <button data-prize-add type="button" disabled={added} aria-label={`${added ? "Ajouté" : "Ajouter"} : ${suggestion.label}`} onClick={() => requestAdd(suggestion)}
                        className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#64206f] ${added ? "bg-[#e4f1e9] text-[#25845b]" : "bg-[#64206f] text-white hover:bg-[#471550]"}`}>
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
      <footer className="shrink-0 space-y-3 border-t border-[#eee8f0] bg-white px-5 py-4 sm:px-6">
        {validationError ? <p role="alert" className="rounded-[10px] bg-[#fff6f5] px-3 py-3 text-sm leading-5 text-[#b42318]">{validationError}</p>
          : projectedTotal > 100.0001 ? <p role="alert" className="rounded-[10px] border border-[#f1c8c6] bg-[#fff6f5] px-3 py-3 text-sm leading-5 text-[#b42318]">Les probabilités dépassent 100 % de {percent(projectedTotal - 100)} points. Vous pourrez ajuster les chances dans la composition avant d’enregistrer le jeu.</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-5 text-[#716b78]">{addedIds.size} suggestion{addedIds.size > 1 ? "s" : ""} ajoutée{addedIds.size > 1 ? "s" : ""} · {percent(Math.max(0, remainingProbability))} % disponibles</p>
          {adjustment ? <button type="button" onClick={() => add(adjustment.suggestion, adjustment.probability)} className="okado-filled-action px-4 text-sm">Ajouter le lot</button>
            : <button ref={doneRef} type="button" onClick={onClose} className="okado-filled-action px-4 text-sm">Terminer</button>}
        </div>
      </footer>
    </DialogShell>
  );
}
