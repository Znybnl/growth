"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CalendarCheck2, CheckCircle2, Globe2, GripVertical, Link2, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { siFacebook, siGoogle, siInstagram, siTiktok, siTripadvisor } from "simple-icons";
import { DialogShell } from "@/components/ui/dialog";
import { MARKETING_ACTION_CATALOG, configuredMarketingUrl, marketingActionEntry, marketingActionKey, marketingDestinationSummary, normalizeMarketingActionUrl, type MarketingActionKey, type MarketingLinks } from "@/lib/marketing-action-library";
import type { CampaignAction, Merchant } from "@/lib/types";

const brands = { google: siGoogle, instagram: siInstagram, facebook: siFacebook, tiktok: siTiktok, tripadvisor: siTripadvisor };
function ActionIcon({ actionKey }: { actionKey: MarketingActionKey | null }) {
  const brand = actionKey && actionKey in brands ? brands[actionKey as keyof typeof brands] : null;
  const Icon = actionKey === "appointment" ? CalendarCheck2 : actionKey === "website" ? Globe2 : Link2;
  return <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-haze text-aubergine" aria-hidden="true">
    {brand ? <svg viewBox="0 0 24 24" className="size-5 fill-current"><path d={brand.path} /></svg> : <Icon className="size-5" />}
  </span>;
}

export function MarketingActionsStep({ merchant, links, actions, onChange, onLinkSaved, adminAccountMerchantId }: {
  merchant: Merchant; links: MarketingLinks; actions: CampaignAction[];
  onChange: (actions: CampaignAction[]) => void;
  onLinkSaved: (key: MarketingActionKey, url: string) => void;
  adminAccountMerchantId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [configuration, setConfiguration] = useState<{ key: MarketingActionKey; index?: number } | null>(null);
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const dragIndex = useRef<number | null>(null);
  const [removed, setRemoved] = useState<{ action: CampaignAction; index: number; previousCount: number } | null>(null);
  const selectedKeys = new Set(actions.map(marketingActionKey));
  const configured = MARKETING_ACTION_CATALOG.filter(entry => configuredMarketingUrl(links, entry.key));
  const unconfigured = MARKETING_ACTION_CATALOG.filter(entry => !configuredMarketingUrl(links, entry.key));
  const editing = configuration?.index !== undefined;
  const entry = configuration ? marketingActionEntry(configuration.key) : null;
  const atLimit = actions.length >= 12;

  function close() { if (!savingRef.current) { setOpen(false); setConfiguration(null); setError(null); } }
  function configure(key: MarketingActionKey, index?: number) {
    setConfiguration({ key, index });
    setDestination(index === undefined ? links[marketingActionEntry(key).field] ?? "" : actions[index].url);
    setError(null); setOpen(true);
  }
  function add(key: MarketingActionKey, url: string) {
    if (actions.length >= 12 || selectedKeys.has(key)) return;
    const entry = marketingActionEntry(key);
    onChange([...actions, { id: `wizard-action-${crypto.randomUUID()}`, kind: entry.kind, label: entry.cta, url }]);
    setOpen(false); setConfiguration(null);
  }
  async function saveConfiguration(event: React.FormEvent) {
    event.preventDefault();
    if (!configuration || savingRef.current) return;
    const snapshot = configuration;
    let url: string;
    try { url = normalizeMarketingActionUrl(snapshot.key, destination); }
    catch (error) { setError(error instanceof Error ? error.message : "Lien invalide."); return; }
    setError(null);
    if (snapshot.index !== undefined) {
      onChange(actions.map((action, index) => index === snapshot.index ? { ...action, url } : action));
      close(); return;
    }
    if (atLimit || selectedKeys.has(snapshot.key)) return;
    savingRef.current = true; setSaving(true);
    try {
      const endpoint = adminAccountMerchantId
        ? `/api/admin/merchants/${encodeURIComponent(adminAccountMerchantId)}/locations/${encodeURIComponent(merchant.id)}/marketing-links`
        : "/api/merchant/marketing-links";
      const response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: snapshot.key, url, ...(!adminAccountMerchantId ? { locationId: merchant.id } : {}) }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Le lien n’a pas pu être enregistré. Réessayez.");
      if (result?.key !== snapshot.key || typeof result?.url !== "string") throw new Error("Réponse d’enregistrement invalide. Réessayez.");
      const savedUrl = normalizeMarketingActionUrl(snapshot.key, result.url);
      onLinkSaved(snapshot.key, savedUrl); add(snapshot.key, savedUrl);
    } catch (error) { setError(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { savingRef.current = false; setSaving(false); }
  }
  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= actions.length || to >= actions.length) return;
    const next = [...actions]; const [item] = next.splice(from, 1); next.splice(to, 0, item); onChange(next);
  }
  function librarySection(title: string, entries: typeof MARKETING_ACTION_CATALOG[number][]) {
    return entries.length ? <section className="mt-6" aria-label={title}>
      <h4 className="text-sm font-semibold text-carbon">{title}</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{entries.map(entry => {
        const added = selectedKeys.has(entry.key); const url = configuredMarketingUrl(links, entry.key);
        return <button key={entry.key} type="button" disabled={added || atLimit} data-testid={`action-library-${entry.key}`}
          onClick={() => url ? add(entry.key, url) : configure(entry.key)}
          className="group flex min-w-0 items-start gap-3 rounded-[12px] border border-fog bg-white p-4 text-left transition-colors hover:border-aubergine/50 hover:bg-purple-haze/40 focus-visible:outline-2 focus-visible:outline-aubergine disabled:cursor-not-allowed disabled:bg-[#f5f3f5] disabled:opacity-55">
          <ActionIcon actionKey={entry.key} />
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-carbon">{entry.label}</span>
            <span className="mt-1 block truncate text-xs text-ash" title={url}>{url ? marketingDestinationSummary(entry.key, url, merchant.googlePlaceName || merchant.companyName) : "Configurer un lien sans quitter ce jeu"}</span>
            <span className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${added ? "bg-fog text-ash" : url ? "bg-[#edf8f2] text-[#246c49]" : "bg-[#fff7e8] text-[#835313]"}`}>
              {added ? <><CheckCircle2 className="size-3" />Déjà ajoutée</> : url ? "Configurée" : "À configurer"}
            </span>
          </span>
          {!added && <span className="mt-1 text-aubergine">{url ? <ArrowRight className="size-4" aria-hidden="true" /> : <span className="text-xs font-semibold">Configurer</span>}</span>}
        </button>;
      })}</div>
    </section> : null;
  }
  return <section className="okado-marketing-actions @container space-y-5" aria-label="Actions proposées">
    <div><h3 className="text-lg font-semibold text-carbon">Les actions de vos clients</h3>
      <p className="mt-2 text-sm leading-6 text-ash">Choisissez les actions à proposer avant le jeu : découvrir votre fiche Google, suivre vos réseaux ou réserver un rendez-vous.</p>
      <p className="mt-2 text-xs leading-5 text-ash">Une action par visite, dans l’ordre ci-dessous. Les liens configurés proviennent de Mon compte · {merchant.companyName}.</p>
    </div>
    {actions.length ? <div className="grid gap-3 @min-[560px]:grid-cols-2" data-testid="selected-marketing-actions">{actions.map((action, index) => {
      const key = marketingActionKey(action); const label = key ? marketingActionEntry(key).label : action.label || "Action existante";
      let invalid = false;
      try { if (key) normalizeMarketingActionUrl(key, action.url); } catch { invalid = true; }
      return <article key={action.id || `legacy-action-${index}`} data-testid={`selected-action-${index}`}
        onDragOver={event => { if (dragIndex.current !== null) event.preventDefault(); }}
        onDrop={event => { if (dragIndex.current !== null) { event.preventDefault(); move(dragIndex.current, index); dragIndex.current = null; } }}
        className="min-w-0 rounded-[12px] border border-fog bg-white p-4">
        <div className="flex items-start gap-2">
          <button type="button" draggable onDragStart={event => { dragIndex.current = index; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(index)); }} onDragEnd={() => { dragIndex.current = null; }}
            aria-label={`Déplacer ${label}, visite ${index + 1}`} title="Glisser pour réordonner, ou utiliser les boutons Monter et Descendre" className="mt-2 cursor-grab rounded-md p-1 text-ash focus-visible:outline-2 focus-visible:outline-aubergine"><GripVertical className="size-4" /></button>
          <button type="button" onClick={() => key && configure(key, index)} disabled={!key} className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-2 focus-visible:outline-aubergine" aria-label={`Modifier ${label}, visite ${index + 1}`}>
            <ActionIcon actionKey={key} /><span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-wider text-ash">Visite {index + 1}</span>
              <span className="mt-0.5 block text-sm font-semibold text-carbon">{label}</span>
              <span title={action.url} className="mt-1 block truncate text-xs text-ash">{invalid ? "Lien à corriger" : key ? marketingDestinationSummary(key, action.url, merchant.googlePlaceName || merchant.companyName) : action.label}</span>
            </span>
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-fog/70 pt-3">
          <button type="button" disabled={!key} onClick={() => key && configure(key, index)} className="inline-flex items-center gap-1 text-xs font-semibold text-aubergine"><Pencil className="size-3" />{invalid ? "Corriger" : "Modifier"}</button>
          <div className="flex gap-1">
            <button type="button" aria-label={`Monter ${label}, visite ${index + 1}`} disabled={index === 0} onClick={() => move(index, index - 1)} className="rounded-md p-2 text-ash hover:bg-purple-haze disabled:opacity-30"><ArrowUp className="size-4" /></button>
            <button type="button" aria-label={`Descendre ${label}, visite ${index + 1}`} disabled={index === actions.length - 1} onClick={() => move(index, index + 1)} className="rounded-md p-2 text-ash hover:bg-purple-haze disabled:opacity-30"><ArrowDown className="size-4" /></button>
            <button type="button" aria-label={`Supprimer ${label}, visite ${index + 1}`} onClick={() => { setRemoved({ action, index, previousCount: actions.filter(item => marketingActionKey(item) === key).length }); onChange(actions.filter((_, i) => i !== index)); }} className="rounded-md p-2 text-ash hover:bg-[#fff0f0] hover:text-[#b42318]"><Trash2 className="size-4" /></button>
          </div>
        </div>
      </article>;
    })}</div> : <div className="rounded-xl border border-dashed border-lavender-mist bg-purple-haze/30 px-5 py-8 text-center">
      <Plus className="mx-auto size-6 text-aubergine" aria-hidden="true" /><h4 className="mt-3 font-semibold text-carbon">Aucune action ajoutée</h4>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ash">Avis, réseaux sociaux, réservation… Composez le parcours de vos clients. Vous pouvez aussi publier sans action marketing, après confirmation.</p>
    </div>}
    {removed && <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-purple-haze px-4 py-3 text-sm text-carbon">Action supprimée
      <button type="button" disabled={atLimit || actions.filter(item => marketingActionKey(item) === marketingActionKey(removed.action)).length >= removed.previousCount} onClick={() => { const next = [...actions]; next.splice(Math.min(removed.index, next.length), 0, removed.action); onChange(next); setRemoved(null); }} className="font-semibold text-aubergine disabled:opacity-50">Annuler</button>
    </div>}
    <button type="button" disabled={atLimit} onClick={() => { setConfiguration(null); setError(null); setOpen(true); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-aubergine px-4 py-3 text-sm font-semibold text-aubergine transition hover:bg-purple-haze disabled:opacity-50"><Plus className="size-4" />Ajouter une action</button>
    {atLimit && <p className="text-xs text-ash">La limite de 12 actions est atteinte.</p>}
    <DialogShell open={open} onClose={close} labelledBy="marketing-library-title" describedBy="marketing-library-description" className="okado-marketing-library flex max-h-[90dvh] w-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-fog p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-aubergine">Bibliothèque d’actions</p>
        <h3 id="marketing-library-title" className="mt-2 text-xl font-semibold text-carbon">{entry ? `${editing ? "Modifier" : "Configurer"} ${entry.label}` : "Ajouter une action"}</h3>
      </div><button type="button" onClick={close} disabled={saving} aria-label="Fermer la bibliothèque d’actions" className="rounded-lg p-2 text-ash hover:bg-purple-haze"><X className="size-5" /></button></div>
        <p id="marketing-library-description" className="mt-2 text-sm leading-6 text-ash">{entry ? editing ? "Cette modification concerne uniquement ce jeu, pas les liens de Mon compte." : `Ce lien sera enregistré dans Mon compte pour ${merchant.companyName}, puis ajouté à ce jeu.` : "Choisissez une action à proposer à vos clients avant leur participation."}</p>
      </div>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-6">
        {entry ? <form onSubmit={saveConfiguration} className="pt-5">
          <button type="button" disabled={saving} onClick={() => { setConfiguration(null); setError(null); }} className="mb-5 inline-flex items-center gap-1 text-xs font-semibold text-aubergine"><ArrowLeft className="size-3" />Retour à la bibliothèque</button>
          <label htmlFor="marketing-link-input" className="block text-sm font-semibold text-carbon">{entry.key === "instagram" || entry.key === "tiktok" ? "Lien ou nom du compte" : "Lien de destination"}</label>
          <input id="marketing-link-input" value={destination} onChange={event => { setDestination(event.target.value); setError(null); }} disabled={saving} aria-invalid={Boolean(error)} aria-describedby={error ? "marketing-link-error" : undefined} autoComplete="off" placeholder={entry.placeholder} className="mt-3 w-full rounded-xl border border-fog px-4 py-3 text-sm text-carbon outline-none focus:border-aubergine focus:ring-4 focus:ring-aubergine/10" />
          {error && <p id="marketing-link-error" role="alert" className="mt-2 text-sm text-[#b42318]">{error}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" disabled={saving} onClick={close} className="okado-secondary-action px-4 text-sm">Annuler</button>
            <button type="submit" disabled={saving} className="okado-primary-action gap-2 px-4 text-sm">{saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{saving ? "Enregistrement…" : editing ? "Enregistrer" : "Enregistrer et ajouter"}</button></div>
        </form> : <>{librarySection("Vos actions configurées", configured)}{librarySection("Autres actions", unconfigured)}</>}
      </div>
    </DialogShell>
  </section>;
}
