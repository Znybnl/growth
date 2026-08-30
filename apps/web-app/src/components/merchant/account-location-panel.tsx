"use client";

import { Building2, Check, MapPin, Plus, X } from "lucide-react";
import { useState } from "react";

import { FieldSelect, Input } from "@/components/ui/field";
import { Merchant, MerchantLocationAccess } from "@/lib/types";

type AccountLocationPanelProps = {
  merchant: Merchant;
  locations: MerchantLocationAccess[];
  isDirty?: boolean;
};

export function AccountLocationPanel({ merchant, locations, isDirty = false }: AccountLocationPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ companyName: "", city: "", address: "", timeZone: "Europe/Paris" });

  async function selectLocation(locationId: string) {
    if (locationId === merchant.id) return;
    if (isDirty && !window.confirm("Vous avez des modifications non enregistrées. Changer d’établissement les abandonnera.")) {
      return;
    }
    setError(null);
    const response = await fetch("/api/merchant/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId }),
    });
    if (!response.ok) {
      setError("L’établissement n’a pas pu être sélectionné.");
      return;
    }
    window.location.assign("/account");
  }

  async function addLocation() {
    if (!form.companyName.trim() || !form.city.trim()) {
      setError("Renseignez le nom et la ville de l’établissement.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/merchant/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { merchant?: Merchant; error?: string };
      if (!response.ok || !payload.merchant) throw new Error(payload.error ?? "L’établissement n’a pas pu être créé.");
      const switchResponse = await fetch("/api/merchant/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: payload.merchant.id }),
      });
      if (!switchResponse.ok) throw new Error("L’établissement a été créé, mais il n’a pas pu être sélectionné.");
      window.location.assign("/account");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "L’établissement n’a pas pu être créé.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className="relative isolate overflow-hidden rounded-[24px] bg-[#101c38] p-5 text-white shadow-[0_20px_48px_rgba(16,28,56,0.16)] md:p-6">
        <div className="pointer-events-none absolute -right-16 -top-24 -z-10 h-64 w-64 rounded-full bg-[#2f6df6]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 h-56 w-56 rounded-full bg-[#8baeff]/15 blur-3xl" />
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-white/10 ring-1 ring-white/15">
              <Building2 className="h-6 w-6 text-[#b8ccff]" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#b8ccff]">Établissement actif</p>
                <span className="rounded-full bg-[#b9f3d0]/15 px-2.5 py-1 text-[11px] font-semibold text-[#b9f3d0]">En cours de gestion</span>
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{merchant.companyName}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[#c9d3e8]"><MapPin className="h-4 w-4" aria-hidden="true" />{merchant.city || "Ville à renseigner"}{merchant.address ? ` · ${merchant.address}` : ""}</p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#aebbd4]">Sélectionnez un établissement pour modifier ses informations, ses canaux marketing et son PIN.</p>
            </div>
          </div>
          <button type="button" onClick={() => setIsAdding(true)} className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[12px] border border-white/20 bg-white px-4 text-sm font-semibold text-[#101c38] transition hover:bg-[#edf3ff] xl:mt-1">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajouter un établissement
          </button>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="mb-3 text-xs font-medium text-[#c9d3e8]">Vos établissements</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {locations.map(({ merchant: location }) => {
              const isActive = location.id === merchant.id;
              return (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => void selectLocation(location.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`group flex min-h-[92px] items-start gap-3 rounded-[16px] border p-3.5 text-left transition ${isActive ? "border-[#8eb0ff] bg-white text-[#101c38] shadow-[0_10px_26px_rgba(0,0,0,0.12)]" : "border-white/15 bg-white/8 text-white hover:border-white/35 hover:bg-white/12"}`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[11px] ${isActive ? "bg-[#edf3ff] text-[#145aff]" : "bg-white/10 text-[#b8ccff]"}`}><Building2 className="h-4 w-4" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{location.companyName}</span>
                    <span className={`mt-1 block truncate text-xs ${isActive ? "text-[#69758a]" : "text-[#b4c0d6]"}`}>{location.city || "Ville à renseigner"}</span>
                  </span>
                  {isActive ? <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#145aff] text-white"><Check className="h-3.5 w-3.5" aria-hidden="true" /></span> : null}
                </button>
              );
            })}
            <button type="button" onClick={() => setIsAdding(true)} className="flex min-h-[92px] items-center justify-center gap-2 rounded-[16px] border border-dashed border-white/25 px-3 text-sm font-semibold text-[#c9d3e8] transition hover:border-white/50 hover:bg-white/8">
              <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter
            </button>
          </div>
        </div>
      </section>

      {error ? <div role="alert" className="rounded-[12px] border border-[#f2c8c8] bg-[#fff4f4] px-4 py-3 text-sm text-[#a11a1a]">{error}</div> : null}

      {isAdding ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-midnight-ink/45 p-3 backdrop-blur-sm md:items-center md:p-6">
          <section role="dialog" aria-modal="true" aria-labelledby="create-location-title" className="w-full max-w-xl rounded-[24px] border border-border bg-white p-6 shadow-[0_28px_80px_rgba(18,24,39,0.24)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="okado-label">Nouveau périmètre</p><h2 id="create-location-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-graphite">Ajouter un établissement</h2><p className="mt-2 text-sm leading-6 text-ash">Créez-le puis ouvrez directement sa fiche pour compléter ses réglages.</p></div>
              <button type="button" onClick={() => setIsAdding(false)} aria-label="Fermer" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ash transition hover:bg-sky-wash hover:text-graphite"><X className="h-5 w-5" /></button>
            </div>
            <div role="form" className="mt-7 space-y-4">
              <label className="block text-sm"><span className="mb-2 block font-medium text-graphite">Nom de l’établissement</span><Input value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} required placeholder="Maison Sora République" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm"><span className="mb-2 block font-medium text-graphite">Ville</span><Input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} required placeholder="Paris République" /></label>
                <label className="block text-sm"><span className="mb-2 block font-medium text-graphite">Fuseau horaire</span><FieldSelect value={form.timeZone} onChange={(event) => setForm((current) => ({ ...current, timeZone: event.target.value }))}><option value="Europe/Paris">France métropolitaine</option><option value="America/Toronto">Canada - Est</option></FieldSelect></label>
              </div>
              <label className="block text-sm"><span className="mb-2 block font-medium text-graphite">Adresse</span><Input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="12 rue..." /></label>
              <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setIsAdding(false)} className="okado-secondary-action px-4 text-sm">Annuler</button><button type="button" onClick={() => void addLocation()} disabled={isSaving} className="okado-filled-action px-4 text-sm disabled:opacity-60">{isSaving ? "Création..." : "Créer et ouvrir"}</button></div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
