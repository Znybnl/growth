"use client";

import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DialogShell } from "@/components/ui/dialog";
import { StatusNotice } from "@/components/ui/workspace";

type Destination = { id: string; companyName: string; city?: string };
type CreatedDraft = { id: string; locationId: string; companyName: string };

export function AdminDuplicateCampaignDialog({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const endpoint = `/api/admin/campaigns/${encodeURIComponent(campaignId)}/duplicate-merchant`;
  const [account, setAccount] = useState<Destination | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [adaptMerchantIdentity, setAdaptMerchantIdentity] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedDraft[]>([]);
  const savingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = account ? new URLSearchParams({ merchantId: account.id }) : new URLSearchParams({ q: query, page: String(page) });
        const response = await fetch(`${endpoint}?${params}`, { signal: controller.signal });
        const payload = await response.json() as { accounts?: Destination[]; locations?: Destination[]; hasNextPage?: boolean; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Destinataires indisponibles.");
        if (controller.signal.aborted) return;
        setDestinations(account ? payload.locations ?? [] : payload.accounts ?? []);
        setHasNextPage(Boolean(payload.hasNextPage));
      } catch (reason) {
        if (!controller.signal.aborted) {
          setDestinations([]);
          setError(reason instanceof Error ? reason.message : "Destinataires indisponibles.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, account ? 0 : 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [account, endpoint, page, query]);

  function chooseAccount(value: Destination | null) {
    setLoading(true);
    setDestinations([]);
    setSelected([]);
    setAccount(value);
  }

  async function duplicate() {
    if (!account || !selected.length || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountMerchantId: account.id, locationIds: selected, adaptMerchantIdentity }),
      });
      const payload = await response.json() as { created?: CreatedDraft[]; error?: string };
      const copies = payload.created ?? [];
      if (copies.length) {
        setCreated((current) => [...current, ...copies]);
        setSelected((current) => current.filter((id) => !copies.some(({ locationId }) => locationId === id)));
      }
      if (!response.ok) throw new Error(payload.error ?? "Duplication impossible.");
      if (!copies.length) throw new Error("Aucun brouillon créé.");
    } catch (reason) {
      setError(reason instanceof Error && !(reason instanceof TypeError) ? reason.message : "Connexion interrompue : vérifiez les jeux du marchand avant de réessayer pour éviter les doublons.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return <DialogShell open onClose={() => { if (!savingRef.current) onClose(); }} labelledBy="admin-duplicate-title" className="max-h-[calc(100dvh-56px)] max-w-2xl overflow-y-auto p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="okado-label">Administration · copie assistée</p>
        <h2 id="admin-duplicate-title" className="mt-2 text-xl font-semibold text-carbon">Dupliquer vers un marchand</h2>
        <p className="mt-2 text-sm leading-6 text-ash">Chaque établissement reçoit un brouillon, son propre QR et ses stocks initiaux. Aucun contact ni résultat n’est copié.</p>
      </div>
      <button type="button" disabled={saving} onClick={onClose} aria-label="Fermer" className="rounded-[4px] p-2 text-ash hover:bg-purple-haze disabled:opacity-50"><X className="h-5 w-5" aria-hidden="true" /></button>
    </div>
    {account ? <div className="mt-5 flex items-center justify-between gap-3 rounded-[10px] bg-purple-haze p-3">
      <p className="min-w-0 text-sm font-semibold text-carbon">{account.companyName}{account.city ? ` · ${account.city}` : ""}</p>
      <button type="button" disabled={saving} onClick={() => chooseAccount(null)} className="shrink-0 text-sm text-aubergine underline">Changer</button>
    </div> : <label className="mt-5 block text-sm font-medium text-carbon">Rechercher un compte marchand
      <input type="search" value={query} onChange={(event) => { setLoading(true); setPage(1); setQuery(event.target.value); }} className="mt-2 h-11 w-full rounded-[10px] border border-fog bg-white px-3" placeholder="Nom du commerce" />
    </label>}
    <div className="mt-4 max-h-[min(35vh,320px)] space-y-2 overflow-y-auto" aria-busy={loading}>
      {loading ? <p role="status" className="flex items-center gap-2 py-5 text-sm text-ash"><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Chargement…</p>
        : destinations.length === 0 ? <StatusNotice tone="info">{account ? "Aucun établissement disponible." : "Aucun compte ne correspond à cette recherche."}</StatusNotice>
          : destinations.map((destination) => account ? <label key={destination.id} className="flex items-center gap-3 rounded-[10px] border border-fog bg-white px-3 py-3 text-sm">
            <input type="checkbox" className="size-4 accent-aubergine" checked={selected.includes(destination.id)} disabled={saving || created.some(({ locationId }) => locationId === destination.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, destination.id] : current.filter((id) => id !== destination.id))} />
            <span><span className="block font-semibold text-carbon">{destination.companyName}</span><span className="text-xs text-ash">{destination.city}{created.some(({ locationId }) => locationId === destination.id) ? " · Brouillon créé" : ""}</span></span>
          </label> : <button type="button" key={destination.id} onClick={() => chooseAccount(destination)} className="block w-full rounded-[10px] border border-fog bg-white px-3 py-3 text-left text-sm hover:border-lavender-mist hover:bg-purple-haze/40">
            <span className="block font-semibold text-carbon">{destination.companyName}</span><span className="text-xs text-ash">{destination.city}</span>
          </button>)}
    </div>
    {!account ? <nav aria-label="Pagination des marchands" className="mt-3 flex items-center justify-end gap-3 text-sm">
      {page > 1 ? <button type="button" onClick={() => { setLoading(true); setPage(page - 1); }} className="text-aubergine underline">Précédent</button> : null}<span className="text-ash">Page {page}</span>
      {hasNextPage ? <button type="button" onClick={() => { setLoading(true); setPage(page + 1); }} className="text-aubergine underline">Suivant</button> : null}
    </nav> : <label className="mt-5 flex items-start gap-3 text-sm text-carbon">
      <input type="checkbox" checked={adaptMerchantIdentity} disabled={saving} onChange={(event) => setAdaptMerchantIdentity(event.target.checked)} className="mt-1 size-4 accent-aubergine" />
      <span><span className="font-semibold">Utiliser le logo et les liens du destinataire</span><span className="mt-1 block text-xs leading-5 text-ash">{adaptMerchantIdentity ? "Les actions sans lien configuré sont retirées. L’expéditeur et l’adresse de réponse sont adaptés au commerce. Le design, les textes et les lots restent ceux du modèle." : "Les logo, liens et réglages d’e-mail du modèle seront conservés : vérifiez-les avant publication."}</span></span>
    </label>}
    {created.length ? <StatusNotice tone="success" className="mt-4"><p className="font-semibold">{created.length} brouillon(s) créé(s)</p><ul className="mt-2 space-y-1">{created.map((copy) => <li key={copy.id}><Link href={`/admin/campaigns/${encodeURIComponent(copy.id)}/edit`} className="underline">Modifier le jeu · {copy.companyName}</Link></li>)}</ul></StatusNotice> : null}
    {error ? <StatusNotice tone="danger" className="mt-4">{error}</StatusNotice> : null}
    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-fog pt-5 sm:flex-row sm:justify-end">
      <button type="button" disabled={saving} onClick={onClose} className="okado-secondary-action px-4 text-sm">Fermer</button>
      <button type="button" onClick={() => void duplicate()} disabled={!account || !selected.length || selected.length > 20 || saving || loading} className="okado-filled-action gap-2 px-4 text-sm disabled:opacity-50">{saving ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Duplication…</> : "Créer les brouillons"}</button>
    </div>
  </DialogShell>;
}
