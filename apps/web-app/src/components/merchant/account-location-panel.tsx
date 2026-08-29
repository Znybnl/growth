"use client";

import { ArrowUpRight, Building2, CheckCircle2, MapPin, Plus, X } from "lucide-react";
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
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ companyName: "", city: "", address: "", timeZone: "Europe/Paris" });

  const configuredChannels = [
    merchant.googleReviewUrl,
    merchant.instagramUrl,
    merchant.facebookUrl,
    merchant.tiktokUrl,
    merchant.tripadvisorUrl,
    merchant.customLinkUrl,
  ].filter(Boolean).length;
  const setupItems = [
    { label: "Informations principales", done: Boolean(merchant.companyName && merchant.city) },
    { label: "Canal Google", done: Boolean(merchant.googleReviewUrl) },
    { label: "Canaux marketing", done: configuredChannels > 0 },
    { label: "PIN de retrait", done: Boolean(merchant.redemptionPinConfigured) },
  ];

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
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-[24px] bg-[#101c38] p-5 text-white shadow-[0_20px_48px_rgba(16,28,56,0.16)] md:p-6">
        <div className="pointer-events-none absolute -right-16 -top-24 -z-10 h-64 w-64 rounded-full bg-[#2f6df6]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 h-56 w-56 rounded-full bg-[#8baeff]/15 blur-3xl" />
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] bg-white/10 ring-1 ring-white/15">
              <Building2 className="h-6 w-6 text-[#b8ccff]" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#b8ccff]">Établissement actif</p>
                <span className="rounded-full bg-[#b9f3d0]/15 px-2.5 py-1 text-[11px] font-semibold text-[#b9f3d0]">Actif</span>
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{merchant.companyName}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[#c9d3e8]">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {merchant.city || "Ville à renseigner"}
                {merchant.address ? ` · ${merchant.address}` : ""}
              </p>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#aebbd4]">
                Les informations, canaux marketing et le PIN ci-dessous concernent uniquement cet établissement.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto xl:items-end">
            <label className="min-w-0 flex-1 text-xs font-medium text-[#c9d3e8] xl:min-w-[270px]">
              <span className="mb-1.5 block">Changer d’établissement</span>
              <FieldSelect value={merchant.id} onChange={(event) => void selectLocation(event.target.value)} aria-label="Sélectionner un établissement" className="min-w-0 border-white/20 bg-white text-graphite">
                {locations.map(({ merchant: location }) => (
                  <option key={location.id} value={location.id}>{location.companyName} · {location.city || "Ville à renseigner"}</option>
                ))}
              </FieldSelect>
            </label>
            <button type="button" onClick={() => setIsAdding(true)} className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[12px] border border-white/20 bg-white px-4 text-sm font-semibold text-[#101c38] transition hover:bg-[#edf3ff]">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Ajouter un établissement
            </button>
          </div>
        </div>
      </section>

      {error ? <div role="alert" className="rounded-[12px] border border-[#f2c8c8] bg-[#fff4f4] px-4 py-3 text-sm text-[#a11a1a]">{error}</div> : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <AccountSettingsForm key={merchant.id} merchant={merchant} user={user} affiliateSummary={affiliateSummary} onDirtyChange={setIsDirty} />
        <aside className="space-y-4 xl:sticky xl:top-24">
          <section className="okado-compact-card bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="okado-label">Vue d’ensemble</p>
                <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-graphite">Configuration</h2>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#edf9f1] text-[#16834e]"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /></span>
            </div>
            <div className="mt-5 space-y-3">
              {setupItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 text-sm">
                  <span className={`grid h-5 w-5 place-items-center rounded-full ${item.done ? "bg-[#e5f8ed] text-[#16834e]" : "bg-[#f1f3f7] text-[#98a1b2]"}`}><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /></span>
                  <span className={item.done ? "text-graphite" : "text-ash"}>{item.label}</span>
                </div>
              ))}
            </div>
          </section>
          <nav aria-label="Sections de l’établissement" className="okado-compact-card bg-white p-3">
            <p className="px-2 py-2 text-xs font-medium uppercase tracking-[0.14em] text-fog">Accès rapide</p>
            {[['account-location', 'Informations'], ['account-channels', 'Canaux marketing'], ['account-pin', 'Validation express']].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="flex items-center justify-between rounded-[10px] px-2 py-2.5 text-sm text-ash transition hover:bg-sky-wash hover:text-graphite">
                {label}<ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            ))}
          </nav>
        </aside>
      </div>

      {isAdding ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-midnight-ink/45 p-3 backdrop-blur-sm md:items-center md:p-6">
          <section role="dialog" aria-modal="true" aria-labelledby="create-location-title" className="w-full max-w-xl rounded-[24px] border border-border bg-white p-6 shadow-[0_28px_80px_rgba(18,24,39,0.24)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="okado-label">Nouveau périmètre</p><h2 id="create-location-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-graphite">Ajouter un établissement</h2><p className="mt-2 text-sm leading-6 text-ash">Créez-le puis ouvrez directement sa fiche pour compléter ses réglages.</p></div>
              <button type="button" onClick={() => setIsAdding(false)} aria-label="Fermer" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ash transition hover:bg-sky-wash hover:text-graphite"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={addLocation} className="mt-7 space-y-4">
              <label className="block text-sm"><span className="mb-2 block font-medium text-graphite">Nom de l’établissement</span><Input value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} required placeholder="Maison Sora République" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm"><span className="mb-2 block font-medium text-graphite">Ville</span><Input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} required placeholder="Paris République" /></label>
                <label className="block text-sm"><span className="mb-2 block font-medium text-graphite">Fuseau horaire</span><FieldSelect value={form.timeZone} onChange={(event) => setForm((current) => ({ ...current, timeZone: event.target.value }))}><option value="Europe/Paris">France métropolitaine</option><option value="America/Toronto">Canada - Est</option></FieldSelect></label>
              </div>
              <label className="block text-sm"><span className="mb-2 block font-medium text-graphite">Adresse</span><Input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="12 rue..." /></label>
              <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={() => setIsAdding(false)} className="okado-secondary-action px-4 text-sm">Annuler</button><button type="submit" disabled={isSaving} className="okado-filled-action px-4 text-sm disabled:opacity-60">{isSaving ? "Création..." : "Créer et ouvrir"}</button></div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
