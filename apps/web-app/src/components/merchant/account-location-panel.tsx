"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { AccountSettingsForm } from "@/components/merchant/account-settings-form";
import { FieldSelect, Input } from "@/components/ui/field";
import { AffiliateSummary, Merchant, MerchantLocationAccess, MerchantUser } from "@/lib/types";

type AccountLocationPanelProps = {
  merchant: Merchant;
  user: MerchantUser;
  locations: MerchantLocationAccess[];
  affiliateSummary?: AffiliateSummary | null;
};

export function AccountLocationPanel({ merchant, user, locations, affiliateSummary }: AccountLocationPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ companyName: "", city: "", address: "", timeZone: "Europe/Paris" });

  async function selectLocation(locationId: string) {
    if (locationId === merchant.id) return;
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
    <div className="space-y-4">
      <section className="okado-card flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="okado-label">Établissement géré</p>
          <p className="mt-2 text-sm text-ash">Les informations, canaux marketing et le PIN ci-dessous concernent l’établissement sélectionné.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <FieldSelect value={merchant.id} onChange={(event) => void selectLocation(event.target.value)} aria-label="Sélectionner un établissement" className="min-w-[240px]">
            {locations.map(({ merchant: location }) => <option key={location.id} value={location.id}>{location.companyName} · {location.city || "Ville à renseigner"}</option>)}
          </FieldSelect>
          <button type="button" onClick={() => setIsAdding(true)} className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#111c35] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d2b4d]"><Plus className="h-4 w-4" />Ajouter</button>
        </div>
      </section>
      {error ? <div role="alert" className="rounded-[12px] border border-[#f2c8c8] bg-[#fff4f4] px-4 py-3 text-sm text-[#a11a1a]">{error}</div> : null}
      <AccountSettingsForm key={merchant.id} merchant={merchant} user={user} affiliateSummary={affiliateSummary} />
      {isAdding ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-midnight-ink/30 p-3 backdrop-blur-sm md:items-center">
          <section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-[var(--okado-radius-modal)] border border-border bg-sky-wash p-6 shadow-[var(--shadow-product-card)] md:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="okado-label">Nouvel établissement</p><h2 className="okado-section-title mt-2">Ajouter un établissement</h2></div><button type="button" onClick={() => setIsAdding(false)} aria-label="Fermer" className="rounded-full p-2 text-ash hover:bg-white"><X className="h-5 w-5" /></button></div>
            <form onSubmit={addLocation} className="mt-6 space-y-4">
              <label className="block text-sm"><span className="mb-2 block text-ash">Nom de l’établissement</span><Input value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} required placeholder="Maison Sora République" /></label>
              <label className="block text-sm"><span className="mb-2 block text-ash">Ville</span><Input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} required placeholder="Paris République" /></label>
              <label className="block text-sm"><span className="mb-2 block text-ash">Adresse</span><Input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="12 rue..." /></label>
              <label className="block text-sm"><span className="mb-2 block text-ash">Fuseau horaire</span><FieldSelect value={form.timeZone} onChange={(event) => setForm((current) => ({ ...current, timeZone: event.target.value }))}><option value="Europe/Paris">France métropolitaine</option><option value="America/Toronto">Canada - Est</option></FieldSelect></label>
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setIsAdding(false)} className="rounded-[12px] border border-border bg-white px-4 py-3 text-sm font-semibold text-graphite">Annuler</button><button type="submit" disabled={isSaving} className="rounded-[12px] bg-[#111c35] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Création..." : "Créer et ouvrir"}</button></div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
