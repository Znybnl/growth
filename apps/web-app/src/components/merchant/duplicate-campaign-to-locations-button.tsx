"use client";

import { CopyPlus, X } from "lucide-react";
import { useState } from "react";

type LocationItem = { merchant: { id: string; companyName: string; city?: string } };

export function DuplicateCampaignToLocationsButton({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function openDialog() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/merchant/locations");
      const payload = (await response.json()) as { locations?: LocationItem[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Sites indisponibles.");
      setLocations(payload.locations ?? []);
      setOpen(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sites indisponibles.");
    } finally {
      setLoading(false);
    }
  }

  async function duplicate() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/duplicate-sites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationIds: selected }),
      });
      const payload = (await response.json()) as { campaignIds?: string[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Duplication impossible.");
      setMessage(`${payload.campaignIds?.length ?? 0} campagne(s) créée(s) en brouillon.`);
      setSelected([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Duplication impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => void openDialog()} disabled={loading} className="inline-flex min-h-9 w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-sm font-semibold text-graphite transition hover:bg-sky-wash disabled:opacity-60"><CopyPlus className="h-4 w-4" />{loading ? "Chargement..." : "Dupliquer vers des sites"}</button>
      {open ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#111827]/30 p-3 backdrop-blur-sm md:items-center"><section role="dialog" aria-modal="true" className="w-full max-w-md rounded-[24px] border border-border bg-[#fbfcfe] p-6 shadow-[0_30px_90px_rgba(17,24,39,0.2)]"><div className="flex items-start justify-between gap-4"><div><p className="okado-label">Déploiement local</p><h2 className="mt-2 text-xl font-semibold text-graphite">Dupliquer cette campagne</h2><p className="mt-2 text-sm leading-6 text-ash">Chaque site reçoit son propre QR, stock et historique.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-full p-2 text-ash hover:bg-white"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-2">{locations.length <= 1 ? <p className="rounded-[12px] bg-[#fff9e8] px-4 py-3 text-sm text-[#74570b]">Ajoutez un autre site pour activer la duplication multi-site.</p> : locations.map(({ merchant }) => <label key={merchant.id} className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-border bg-white px-3 py-3 text-sm"><input type="checkbox" checked={selected.includes(merchant.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, merchant.id] : current.filter((id) => id !== merchant.id))} className="h-4 w-4 accent-[#b28719]" /><span><span className="block font-semibold text-graphite">{merchant.companyName}</span><span className="text-xs text-ash">{merchant.city}</span></span></label>)}</div>{message ? <p role="status" className="mt-4 rounded-[12px] bg-[#effaf3] px-3 py-2 text-sm text-[#1f7d53]">{message}</p> : null}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-[12px] border border-border bg-white px-4 py-3 text-sm font-semibold text-graphite">Fermer</button><button type="button" onClick={() => void duplicate()} disabled={!selected.length || saving || locations.length <= 1} className="rounded-[12px] bg-[#111827] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Duplication..." : "Créer les brouillons"}</button></div></section></div> : null}
    </>
  );
}
