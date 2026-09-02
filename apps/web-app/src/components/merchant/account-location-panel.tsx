"use client";

import { Building2, Check, MapPin, Plus, X } from "lucide-react";
import { useState } from "react";

import { FieldSelect, Input } from "@/components/ui/field";
import { DialogShell } from "@/components/ui/dialog";
import { Merchant, MerchantLocationAccess } from "@/lib/types";

type AccountLocationPanelProps = {
  merchant: Merchant;
  locations: MerchantLocationAccess[];
  onSelectLocation: (locationId: string) => void;
};

export function AccountLocationPanel({ merchant, locations, onSelectLocation }: AccountLocationPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ companyName: "", city: "", address: "", timeZone: "Europe/Paris" });

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
      window.location.assign("/account");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "L’établissement n’a pas pu être créé.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className="okado-card p-5 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[4px] bg-purple-haze text-aubergine">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal">Contexte du formulaire</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-carbon">Quel établissement souhaitez-vous modifier ?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ash">Choisissez une carte : les informations affichées dans le formulaire inférieur seront remplacées par celles de cet établissement.</p>
            </div>
          </div>
          <button type="button" onClick={() => setIsAdding(true)} className="okado-secondary-action px-4 text-sm">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajouter
          </button>
        </div>

          <div className="mt-5 rounded-[8px] border border-lavender-mist bg-purple-haze px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="rounded-[4px] bg-aubergine px-2.5 py-1 text-[11px] font-semibold text-white">Formulaire affiché ci-dessous</span>
            <strong className="text-sm text-carbon">{merchant.companyName}</strong>
            <span className="flex items-center gap-1.5 text-xs text-charcoal"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{merchant.city || "Ville à renseigner"}{merchant.address ? ` · ${merchant.address}` : ""}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-ash">La sélection ci-dessus ne change pas l’établissement actif dans le reste de l’application.</p>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal">Vos établissements</p>
            <span className="text-xs text-ash">{locations.length} sélectionnable{locations.length > 1 ? "s" : ""}</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {locations.map(({ merchant: location }) => {
              const isSelected = location.id === merchant.id;
              return (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => onSelectLocation(location.id)}
                  aria-pressed={isSelected}
                  className={`group flex min-h-[76px] items-center gap-3 rounded-[8px] border px-3.5 py-3 text-left transition ${isSelected ? "border-aubergine bg-purple-haze ring-2 ring-aubergine/10" : "border-fog bg-white hover:border-lavender-mist hover:bg-purple-haze/40"}`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[4px] ${isSelected ? "bg-aubergine text-white" : "bg-soft-white text-ash"}`}><Building2 className="h-4 w-4" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-carbon">{location.companyName}</span>
                    <span className="mt-1 block truncate text-xs text-ash">{location.city || "Ville à renseigner"}</span>
                  </span>
                  {isSelected ? <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-aubergine"><Check className="h-3.5 w-3.5" aria-hidden="true" />Affiché</span> : null}
                </button>
              );
            })}
            <button type="button" onClick={() => setIsAdding(true)} className="flex min-h-[76px] items-center justify-center gap-2 rounded-[8px] border border-dashed border-lavender-mist px-3 text-sm font-semibold text-charcoal transition hover:border-aubergine hover:bg-purple-haze/50">
              <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter un établissement
            </button>
          </div>
        </div>
      </section>

      {error ? <div role="alert" className="rounded-[8px] border border-coral-alert/30 bg-coral-alert/10 px-4 py-3 text-sm text-coral-alert">{error}</div> : null}

      {isAdding ? (
        <DialogShell open={isAdding} onClose={() => setIsAdding(false)} labelledBy="create-location-title" className="max-w-xl p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="okado-label">Nouveau périmètre</p><h2 id="create-location-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-graphite">Ajouter un établissement</h2><p className="mt-2 text-sm leading-6 text-ash">Il sera ajouté à vos cartes sans modifier l’établissement actif dans le reste de l’application.</p></div>
              <button type="button" onClick={() => setIsAdding(false)} aria-label="Fermer" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ash transition hover:bg-sky-wash hover:text-graphite"><X className="h-5 w-5" /></button>
            </div>
            <div role="form" className="mt-7 space-y-4">
              <label className="block text-sm"><span className="mb-2 block font-medium text-graphite">Nom de l’établissement</span><Input value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} required placeholder="Maison Sora République" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm"><span className="mb-2 block font-medium text-graphite">Ville</span><Input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} required placeholder="Paris République" /></label>
                <label className="block text-sm"><span className="mb-2 block font-medium text-graphite">Fuseau horaire</span><FieldSelect value={form.timeZone} onChange={(event) => setForm((current) => ({ ...current, timeZone: event.target.value }))}><option value="Europe/Paris">France métropolitaine</option><option value="America/Toronto">Canada - Est</option></FieldSelect></label>
              </div>
              <label className="block text-sm"><span className="mb-2 block font-medium text-graphite">Adresse</span><Input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="12 rue..." /></label>
              <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setIsAdding(false)} className="okado-secondary-action px-4 text-sm">Annuler</button><button type="button" onClick={() => void addLocation()} disabled={isSaving} className="okado-filled-action px-4 text-sm disabled:opacity-60">{isSaving ? "Création..." : "Créer l’établissement"}</button></div>
            </div>
        </DialogShell>
      ) : null}
    </>
  );
}
