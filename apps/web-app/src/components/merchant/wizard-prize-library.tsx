"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BadgePercent, Check, ChevronLeft, CirclePlus, Coffee, Gift, History, Layers3, Loader2, Plus, Soup, Sparkles, UtensilsCrossed, X } from "lucide-react";
import { DialogShell } from "@/components/ui/dialog";
import type { PrizeSuggestion } from "@/lib/types";
import type { ReusablePrize } from "@/lib/reusable-prizes";
import { useReusablePrizes } from "@/lib/use-reusable-prizes";
import { buildPrizeCompositions, type PrizeComposition, type PrizeCompositionContext } from "@/lib/prize-compositions";
import { WizardPrizeCompositions } from "./wizard-prize-compositions";
import { isPrizeCostKnown } from "@/lib/prize-budget";
import styles from "./wizard-prize-library.module.css";
import { canFilterBeautySuggestions, filterPrizeSuggestionsBySubsector } from "@/lib/prize-suggestion-filters";
import { PrizeSuggestionSubsectorFilter } from "./prize-suggestion-subsector-filter";

const icons = { coffee: Coffee, dessert: Sparkles, drink: Soup, discount: BadgePercent, supplement: CirclePlus, menu: UtensilsCrossed, gift: Gift, history: History };
const percent = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
type LibraryEntry = PrizeSuggestion & { previous?: ReusablePrize };

export function WizardPrizeLibrary({ suggestions, addedIds, remainingProbability, activityLabel, isLoading, error, onRetry, onAdd, onClose,
  previousPrizesEndpoint, excludeCampaignId, isPreviousAdded, onReuse, configuredPrizeCount, onApplyComposition, compositionContext, initialCompositionId, winningEveryTime = false, initialTab = "suggestions" }: {
  suggestions: PrizeSuggestion[];
  compositionContext?: PrizeCompositionContext;
  initialCompositionId?: string;
  addedIds: ReadonlySet<string>;
  remainingProbability: number;
  activityLabel?: string;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onAdd: (suggestion: PrizeSuggestion, probability: number) => void;
  onClose: () => void;
  previousPrizesEndpoint?: string;
  excludeCampaignId?: string;
  isPreviousAdded?: (prize: ReusablePrize) => boolean;
  onReuse?: (prize: ReusablePrize, probability: number, quantity: number | null) => void;
  configuredPrizeCount?: number;
  onApplyComposition?: (composition: PrizeComposition) => void;
  winningEveryTime?: boolean;
  initialTab?: "suggestions" | "mine" | "compositions";
}) {
  const [tab, setTab] = useState<"suggestions" | "mine" | "compositions">(initialTab);
  const [subsectorFilter, setSubsectorFilter] = useState("");
  const filterEnabled = canFilterBeautySuggestions(compositionContext);
  const filteredSuggestions = filterEnabled ? filterPrizeSuggestionsBySubsector(suggestions, subsectorFilter) : suggestions;
  const compositions = useMemo(() => buildPrizeCompositions(suggestions, compositionContext), [suggestions, compositionContext]);
  const [compositionId, setCompositionId] = useState<string | null>(initialCompositionId ?? null);
  const [confirmReplacement, setConfirmReplacement] = useState(false);
  const selectedComposition = compositions.find((item) => item.id === compositionId) ?? null;
  const previous = useReusablePrizes(previousPrizesEndpoint, tab === "mine", excludeCampaignId);
  const entries: readonly LibraryEntry[] = tab === "suggestions" ? filteredSuggestions : previous.prizes.map((prize, sortOrder) => ({
    id: `previous-${prize.id}`, label: prize.label, description: prize.usageConditions,
    probability: prize.probability, estimatedUnitCost: prize.estimatedUnitCost,
    icon: "history", industry: "", isActive: true, sortOrder, previous: prize,
  }));
  const loading = tab === "mine" ? previous.isLoading : isLoading;
  const loadError = tab === "mine" ? previous.error : error;
  const retry = tab === "mine" ? previous.retry : onRetry;
  const [adjustment, setAdjustment] = useState<{ suggestion: LibraryEntry; probability: number; quantity: number | null } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const originRef = useRef<{ id: string; scrollTop: number } | null>(null);
  const focusFrame = useRef<number | null>(null);
  const projectedTotal = 100 - remainingProbability + (adjustment?.probability ?? 0);
  const hasLimitedStock = adjustment?.suggestion.previous?.totalQuantity != null;
  const isAdded = (entry: LibraryEntry) => entry.previous ? Boolean(isPreviousAdded?.(entry.previous)) : addedIds.has(entry.id);

  function selectTab(next: typeof tab) {
    setTab(next);
    setCompositionId(null);
    setConfirmReplacement(false);
    setAdjustment(null);
    setValidationError(null);
    setLastAdded("");
    originRef.current = null;
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }

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

  function add(suggestion: LibraryEntry, probability: number, quantity: number | null = suggestion.previous?.totalQuantity ?? null) {
    if (isAdded(suggestion)) return;
    if (!suggestion.label.trim() || !Number.isFinite(probability) || probability < 0 || probability > 100
      || !Number.isFinite(suggestion.estimatedUnitCost) || suggestion.estimatedUnitCost < 0) {
      setValidationError("Vérifiez les informations de ce lot : un nom, une chance entre 0 et 100 % et un coût positif ou nul sont nécessaires.");
      return;
    }
    if (quantity !== null && (!Number.isSafeInteger(quantity) || quantity <= 0)) {
      setValidationError("Le nouveau stock doit être un nombre entier supérieur à 0, ou illimité.");
      return;
    }
    if (suggestion.previous) {
      if (!onReuse) return;
      onReuse(suggestion.previous, probability, quantity);
    } else onAdd(suggestion, probability);
    setAdjustment(null);
    setValidationError(null);
    setLastAdded(`${suggestion.label} ajouté à votre composition.`);
    restoreCatalogFocus(suggestion.id, true);
  }

  function requestAdd(suggestion: LibraryEntry) {
    originRef.current = { id: suggestion.id, scrollTop: contentRef.current?.scrollTop ?? 0 };
    setValidationError(null);
    if (suggestion.probability > remainingProbability + 0.0001 || suggestion.previous?.totalQuantity != null) {
      setAdjustment({ suggestion, probability: suggestion.probability, quantity: suggestion.previous?.totalQuantity ?? null });
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
      focusFrame.current = requestAnimationFrame(() => {
        if (contentRef.current) contentRef.current.scrollTop = 0;
        focusFrame.current = null;
      });
    } else {
      add(suggestion, suggestion.probability);
    }
  }

  function applyComposition() {
    if (!selectedComposition || !onApplyComposition || loading || loadError) return;
    if ((configuredPrizeCount ?? addedIds.size) > 0 && !confirmReplacement) {
      setConfirmReplacement(true);
      if (contentRef.current) contentRef.current.scrollTop = 0;
      return;
    }
    onApplyComposition(selectedComposition);
  }

  return (
    <DialogShell open onClose={() => confirmReplacement ? setConfirmReplacement(false) : onClose()} labelledBy="wizard-prize-library-title" describedBy="wizard-prize-library-description" className={styles.prizeLibrarySurface}>
      <header className={`${styles.libraryHeader} flex items-start justify-between gap-4`}>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#716b78]">Idées pour votre activité</p>
          <h2 id="wizard-prize-library-title" className="mt-1 text-xl font-semibold text-[#242126]">Ajouter des lots</h2>
          <p id="wizard-prize-library-description" className="mt-1 text-sm leading-5 text-[#716b78]">Choisissez des idées ou réutilisez vos lots précédents, puis personnalisez votre composition.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer la bibliothèque de lots" className="okado-dialog-dismiss"><X className="size-4" aria-hidden="true" /></button>
      </header>
      <div role="tablist" aria-label="Bibliothèque de lots" className={styles.libraryTabs}>
        {(["suggestions", "mine", "compositions"] as const).map((value) => <button key={value} type="button" role="tab"
          id={`prize-tab-${value}`} aria-selected={tab === value} aria-controls="prize-library-panel" tabIndex={tab === value ? 0 : -1}
          onClick={() => selectTab(value)} onKeyDown={(event) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const tabs = ["suggestions", "mine", "compositions"] as const;
              const index = tabs.indexOf(tab);
              const next = tabs[event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3];
              selectTab(next);
              document.getElementById(`prize-tab-${next}`)?.focus();
            }
          }}><span className="inline-flex items-center gap-2">{value === "mine" ? <History className="size-4" aria-hidden="true" /> : value === "compositions" ? <Layers3 className="size-4" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}{value === "mine" ? "Mes lots" : value === "compositions" ? "Compositions" : "Suggestions"}</span></button>)}
      </div>
      <div ref={contentRef} id="prize-library-panel" role="tabpanel" aria-labelledby={`prize-tab-${tab}`} className={styles.libraryContent} data-testid="wizard-prize-library-content">
        {tab === "suggestions" && filterEnabled && !adjustment && !loading && !loadError ? (
          <PrizeSuggestionSubsectorFilter suggestions={suggestions} value={subsectorFilter} onChange={value => {
            setSubsectorFilter(value);
            setValidationError(null);
            setLastAdded("");
            originRef.current = null;
            if (focusFrame.current !== null) {
              cancelAnimationFrame(focusFrame.current);
              focusFrame.current = null;
            }
          }} />
        ) : null}
        {adjustment ? (
          <section aria-labelledby="wizard-suggestion-adjustment-title" className="mx-auto max-w-xl space-y-4">
            <button type="button" onClick={cancelAdjustment} className="inline-flex items-center gap-1 text-sm font-semibold text-[#64206f]"><ChevronLeft className="size-4" aria-hidden="true" />{tab === "mine" ? "Retour à mes lots" : "Retour aux suggestions"}</button>
            <div>
              <h3 id="wizard-suggestion-adjustment-title" className="text-lg font-semibold text-[#242126]">{adjustment.suggestion.previous ? "Préparez la copie de ce lot" : "Ajustez la chance de ce lot"}</h3>
              <p className="mt-1 text-sm font-semibold text-[#64206f]">{adjustment.suggestion.label}</p>
            </div>
            <div className={hasLimitedStock ? "grid gap-4 sm:grid-cols-2 sm:items-start" : ""}>
            <div className={hasLimitedStock ? "space-y-3" : "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"}>
              <label className="block text-sm font-semibold text-[#242126]">
                Chance de gain pour ce lot (%)
                <input autoFocus type="number" min={0} max={100} step="any" value={adjustment.probability}
                  onChange={(event) => { setAdjustment({ ...adjustment, probability: Number(event.target.value || 0) }); setValidationError(null); }}
                  className="mt-2 block w-full rounded-[10px] border border-[#e8e2ea] bg-white px-3 py-3 text-sm outline-none focus:border-[#64206f] focus:ring-2 focus:ring-[#64206f]/15" />
              </label>
              {remainingProbability > 0 && adjustment.probability > remainingProbability ? <button type="button" onClick={() => add(adjustment.suggestion, remainingProbability, adjustment.quantity)} className="okado-secondary-action px-3 text-[13px]">Ajouter avec les {percent(remainingProbability)} % disponibles</button> : null}
            </div>
            {hasLimitedStock ? <div className="rounded-[12px] border border-[#e8e2ea] bg-white p-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={adjustment.quantity === null}
                onChange={(event) => { setAdjustment({ ...adjustment, quantity: event.target.checked ? null : adjustment.suggestion.previous!.totalQuantity }); setValidationError(null); }} />Utiliser un stock illimité</label>
              {adjustment.quantity !== null ? <label className="mt-3 block text-sm font-semibold">Nouveau stock initial
                <input type="number" min={1} step={1} value={adjustment.quantity} onChange={(event) => { setAdjustment({ ...adjustment, quantity: Number(event.target.value) }); setValidationError(null); }}
                  className="mt-2 block w-full rounded-[10px] border border-[#e8e2ea] px-3 py-3 font-normal" />
              </label> : null}
              <p className="mt-2 text-[13px] leading-5 text-[#716b78]">Confirmez le stock de ce nouveau jeu. Le stock restant de l’ancien jeu n’est jamais repris.</p>
            </div> : null}
            </div>
            <p className="text-sm leading-6 text-[#716b78]">{tab === "mine" ? "La chance précédemment utilisée était de" : "La suggestion propose"} {percent(adjustment.suggestion.probability)} %, et {percent(Math.max(0, remainingProbability))} % restent disponibles. Les chances des autres lots restent inchangées.</p>
            {remainingProbability <= 0 ? <p className="rounded-[10px] bg-[#f6f0fa] p-3 text-sm leading-5 text-[#64206f]">Toutes les chances sont déjà réparties. Vous pouvez préparer ce lot, mais vous devrez réduire les chances des autres lots dans la composition avant d’enregistrer le jeu.</p> : null}
          </section>
        ) : loading ? (
          <p role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-[#716b78]"><Loader2 className="size-5 animate-spin" aria-hidden="true" />{tab === "mine" ? "Chargement de vos lots…" : "Chargement des suggestions…"}</p>
        ) : loadError ? (
          <div className="rounded-[12px] border border-[#f1c8c6] bg-[#fff6f5] p-5">
            <p role="alert" className="text-sm leading-6 text-[#b42318]">{loadError}</p>
            <button type="button" onClick={retry} className="okado-secondary-action mt-3 px-4 text-sm">Réessayer</button>
          </div>
        ) : tab === "compositions" ? (
          <WizardPrizeCompositions compositions={compositions} selected={selectedComposition} confirming={confirmReplacement} winningEveryTime={winningEveryTime}
            onSelect={(id) => { setCompositionId(id); if (contentRef.current) contentRef.current.scrollTop = 0; }} onBack={() => setCompositionId(null)} />
        ) : !entries.length ? (
          <div className="rounded-[12px] border border-dashed border-[#e8e2ea] px-5 py-8 text-center">
            <Gift className="mx-auto size-7 text-[#8c5b98]" aria-hidden="true" />
            <h3 className="mt-3 font-semibold text-[#242126]">{tab === "mine" ? "Vous n’avez pas encore de lots enregistrés." : filterEnabled && subsectorFilter ? "Aucune suggestion pour ce sous-secteur" : "Aucune suggestion pour cette activité"}</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#716b78]">{tab === "mine" ? "Les lots de vos prochaines campagnes pourront être réutilisés ici." : "Vous pouvez créer votre propre lot depuis la composition. Son nom, sa chance et ses conditions restent entièrement personnalisables."}</p>
            <button type="button" onClick={tab === "mine" ? () => { selectTab("suggestions"); document.getElementById("prize-tab-suggestions")?.focus(); } : onClose} className="okado-secondary-action mt-4 px-4 text-sm">{tab === "mine" ? "Explorer les suggestions" : "Retour à ma composition"}</button>
          </div>
        ) : (
          <section aria-labelledby="wizard-prize-suggestions-title">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 id="wizard-prize-suggestions-title" className="text-sm font-semibold text-[#242126]">{tab === "mine" ? "Les lots de vos jeux précédents" : "Suggestions"}</h3>
                {activityLabel ? <p className="mt-1 text-[13px] leading-5 text-[#716b78]">Activité : {activityLabel}</p> : null}
              </div>
              <span className="text-[13px] text-[#716b78]">{entries.length} {tab === "mine" ? "lots réutilisables" : "idées pour votre activité"}</span>
            </div>
            <p className="mb-4 text-[13px] leading-5 text-[#716b78]">Coûts indicatifs, à adapter à votre établissement : estimez votre coût réel, pas la valeur du cadeau pour le client.</p>
            <div className={styles.libraryGrid}>
              {entries.map((suggestion) => {
                const added = isAdded(suggestion);
                const Icon = icons[suggestion.icon as keyof typeof icons] ?? Gift;
                return (
                  <article key={suggestion.id} data-testid="wizard-prize-suggestion-card" data-added={added} className={styles.libraryCard}>
                    <div className="flex items-start gap-3">
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${added ? "bg-[#e4f1e9] text-[#25845b]" : "bg-[#f6f0fa] text-[#64206f]"}`}><Icon className="size-4" aria-hidden="true" /></span>
                      <div className="min-w-0">
                        <h4 className="break-words text-sm font-semibold leading-5 text-[#242126]">{suggestion.label}</h4>
                        <p className="mt-1 break-words text-[13px] leading-5 text-[#716b78]">{suggestion.description}</p>
                        {suggestion.previous ? <p className="mt-2 break-words text-[13px] leading-5 text-[#716b78]">Jeu d’origine : {suggestion.previous.sourceCampaignTitle}<br />Stock initial : {suggestion.previous.totalQuantity ?? "Illimité"}{suggestion.previous.purchaseRequired ? " · Achat requis" : ""}</p> : null}
                      </div>
                    </div>
                    <div className={styles.libraryCardBottom}>
                      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[#716b78]">
                        <div><dt>{tab === "mine" ? "Chance utilisée" : "Chance suggérée"}</dt><dd className="mt-1 font-semibold tabular-nums text-[#242126]">{percent(suggestion.probability)} %</dd></div>
                        <div><dt>Coût estimé</dt><dd className="mt-1 font-semibold tabular-nums text-[#242126]">{isPrizeCostKnown(suggestion.previous ?? suggestion) ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(suggestion.estimatedUnitCost) : "Non renseigné"}</dd></div>
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
          : tab !== "compositions" && projectedTotal > 100.0001 ? <p role="alert" className="rounded-[10px] border border-[#f1c8c6] bg-[#fff6f5] px-3 py-3 text-sm leading-5 text-[#b42318]">Les probabilités dépassent 100 % de {percent(projectedTotal - 100)} points. Vous pourrez ajuster les chances dans la composition avant d’enregistrer le jeu.</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[13px] leading-5 text-[#716b78]">
            <p>{configuredPrizeCount ?? addedIds.size} lot{(configuredPrizeCount ?? addedIds.size) > 1 ? "s" : ""} dans votre composition</p>
            <p>Chances restantes à répartir : <strong className="font-semibold text-[#242126]">{percent(Math.max(0, remainingProbability))} %</strong></p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tab === "compositions" && selectedComposition && !loading && !loadError ? <>
              {confirmReplacement ? <button type="button" autoFocus onClick={() => setConfirmReplacement(false)} className="okado-secondary-action px-3 text-sm">Annuler</button> : null}
              <button type="button" onClick={applyComposition} disabled={!onApplyComposition} className="okado-filled-action px-4 text-sm">{confirmReplacement ? "Remplacer les lots" : "Utiliser cette composition"}</button>
            </> : adjustment ? <>
              <button type="button" onClick={cancelAdjustment} className="okado-secondary-action px-3 text-[13px]">Annuler l’ajout</button>
              <button type="button" onClick={() => add(adjustment.suggestion, adjustment.probability, adjustment.quantity)} className="okado-filled-action px-4 text-sm">Ajouter le lot</button>
            </> : <button ref={doneRef} type="button" onClick={onClose} className="okado-filled-action px-4 text-sm">Terminer</button>}
          </div>
        </div>
      </footer>
    </DialogShell>
  );
}
