"use client";

import { Building2, MapPin, Plus, Archive, X } from "lucide-react";
import { useState } from "react";

import { MerchantLocationAccess, MerchantWorkspace } from "@/lib/types";

const inputClass = "w-full rounded-[12px] border border-[#cfd7e3] bg-white px-4 py-3 text-sm text-graphite outline-none transition focus:border-primary-action-accent focus:ring-4 focus:ring-primary-action-accent/10";

export function LocationManager({
  workspace,
  locations,
}: {
  workspace?: MerchantWorkspace;
  locations: MerchantLocationAccess[];
}) {
  const [items, setItems] = useState(locations);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ companyName: "", city: "", address: "", timeZone: "Europe/Paris" });

  async function addLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/merchant/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { merchant?: MerchantLocationAccess["merchant"]; error?: string };
      if (!response.ok || !payload.merchant) throw new Error(payload.error ?? "Le site n'a pas pu être créé.");
      setItems((current) => [...current, { merchant: payload.merchant!, role: "admin" }]);
      setForm({ companyName: "", city: "", address: "", timeZone: "Europe/Paris" });
      setIsAdding(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Le site n'a pas pu être créé.");
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveLocation(id: string) {
    if (!window.confirm("Archiver ce site ? Ses campagnes et données resteront conservées.")) return;
    setError(null);
    try {
      const response = await fetch(`/api/merchant/locations/${encodeURIComponent(id)}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Archivage impossible.");
      setItems((current) => current.filter(({ merchant }) => merchant.id !== id));
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Archivage impossible.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-[#111c35] px-6 py-7 text-white shadow-[0_22px_60px_rgba(17,28,53,0.14)] md:px-8">
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#f4c14a]/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#c8d1e3]">Réseau</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Multi-sites au même endroit.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c8d1e3]">
              {workspace?.name ?? "Votre workspace"} · chaque campagne, QR et retrait reste rattaché au bon établissement.
            </p>
          </div>
          <button type="button" onClick={() => setIsAdding(true)} className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#f4c14a] px-4 py-3 text-sm font-semibold text-[#111827] transition hover:bg-[#ffd66f]"><Plus className="h-4 w-4" />Ajouter un site</button>
        </div>
      </section>

      {error ? <div role="alert" className="rounded-[14px] border border-[#f2c8c8] bg-[#fff4f4] px-4 py-3 text-sm text-[#a11a1a]">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map(({ merchant, role }) => (
          <article key={merchant.id} className="rounded-[22px] border border-border bg-white p-5 shadow-[var(--shadow-product-card)]">
            <div className="flex items-start justify-between gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-sky-wash text-primary-action-accent"><Building2 className="h-5 w-5" /></div><span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#047857]">Actif</span></div>
            <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-graphite">{merchant.companyName}</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-ash"><MapPin className="h-4 w-4" />{merchant.city || "Ville à renseigner"}</p>
            <div className="mt-5 flex items-center justify-between border-t border-[#edf0f4] pt-4"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-ash">{merchant.locationCode ?? merchant.id.slice(-6).toUpperCase()} · {role}</span>{items.length > 1 && ["owner", "admin"].includes(role) ? <button type="button" onClick={() => void archiveLocation(merchant.id)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a11a1a] hover:underline"><Archive className="h-3.5 w-3.5" />Archiver</button> : null}</div>
          </article>
        ))}
      </section>

      {isAdding ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#111827]/30 p-3 backdrop-blur-sm md:items-center"><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-[26px] border border-border bg-[#fbfcfe] p-6 shadow-[0_30px_90px_rgba(17,24,39,0.2)] md:p-8"><div className="flex items-start justify-between gap-4"><div><p className="okado-label">Nouveau site</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-graphite">Ajouter un établissement</h2></div><button type="button" onClick={() => setIsAdding(false)} aria-label="Fermer" className="rounded-full p-2 text-ash hover:bg-white"><X className="h-5 w-5" /></button></div><form onSubmit={addLocation} className="mt-6 space-y-4"><label className="block text-sm"><span className="mb-2 block text-ash">Nom du site</span><input className={inputClass} value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} required placeholder="Maison Sora République" /></label><label className="block text-sm"><span className="mb-2 block text-ash">Ville</span><input className={inputClass} value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} required placeholder="Paris République" /></label><label className="block text-sm"><span className="mb-2 block text-ash">Adresse</span><input className={inputClass} value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="12 rue..." /></label><label className="block text-sm"><span className="mb-2 block text-ash">Fuseau horaire</span><select className={inputClass} value={form.timeZone} onChange={(event) => setForm((current) => ({ ...current, timeZone: event.target.value }))}><option value="Europe/Paris">France métropolitaine</option><option value="America/Toronto">Canada - Est</option></select></label><div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setIsAdding(false)} className="rounded-[12px] border border-border bg-white px-4 py-3 text-sm font-semibold text-graphite">Annuler</button><button type="submit" disabled={isSaving} className="rounded-[12px] bg-[#111827] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Création..." : "Créer le site"}</button></div></form></section></div> : null}
    </div>
  );
}

