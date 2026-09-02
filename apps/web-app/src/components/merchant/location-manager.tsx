"use client";

import { Building2, MapPin, Plus, Archive, X, AlertTriangle } from "lucide-react";
import { useState } from "react";

import { MerchantLocationAccess, MerchantWorkspace } from "@/lib/types";
import { FieldSelect, Input } from "@/components/ui/field";

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
  const [openingLocationId, setOpeningLocationId] = useState<string | null>(null);
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
      const switchResponse = await fetch("/api/merchant/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: payload.merchant.id }),
      });
      if (!switchResponse.ok) throw new Error("Le site a été créé, mais il n'a pas pu être sélectionné.");
      // The selected site is stored in an httpOnly cookie by the API. A hard
      // navigation makes the following server render consume that new cookie,
      // instead of reusing a prefetched /account RSC for the previous site.
      window.location.assign("/account");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Le site n'a pas pu être créé.");
    } finally {
      setIsSaving(false);
    }
  }

  function getMissingInformation(merchant: MerchantLocationAccess["merchant"]) {
    const missing = [
      !merchant.address ? "Adresse" : null,
      !merchant.contactName ? "Nom du contact" : null,
      !merchant.phone ? "Téléphone" : null,
      !merchant.restaurantEmail ? "E-mail de contact" : null,
    ].filter((value): value is string => Boolean(value));
    const hasLink = [
      merchant.websiteUrl,
      merchant.googleReviewUrl,
      merchant.instagramUrl,
      merchant.facebookUrl,
      merchant.tiktokUrl,
      merchant.tripadvisorUrl,
      merchant.customLinkUrl,
    ].some((value) => Boolean(value?.trim()));
    if (!hasLink) missing.push("Au moins un lien de diffusion");
    return missing;
  }

  async function openAccountForLocation(locationId: string) {
    setError(null);
    setOpeningLocationId(locationId);
    try {
      const response = await fetch("/api/merchant/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId }),
      });
      if (!response.ok) throw new Error("Le site n'a pas pu être sélectionné.");
      // See the creation flow above: /account must be rendered with the site
      // just selected, never with the location cached by the client router.
      window.location.assign("/account");
    } catch (navigationError) {
      setError(navigationError instanceof Error ? navigationError.message : "Ouverture du compte impossible.");
      setOpeningLocationId(null);
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
      <section className="relative overflow-hidden rounded-[var(--okado-radius-modal)] bg-[#111c35] px-6 py-7 text-white shadow-[var(--shadow-product-card)] md:px-8">
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-purple-haze/60 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#c8d1e3]">Réseau</p>
            <h1 className="okado-page-title mt-3 !text-white">Tous vos sites au même endroits.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c8d1e3]">
              {workspace?.name ?? "Votre workspace"} · chaque campagne, QR et retrait reste rattaché au bon établissement.
            </p>
          </div>
          <button type="button" onClick={() => setIsAdding(true)} className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-aubergine px-4 py-3 text-sm font-semibold text-white transition hover:bg-deep-plum"><Plus className="h-4 w-4" />Ajouter un site</button>
        </div>
      </section>

      {error ? <div role="alert" className="rounded-[14px] border border-[#f2c8c8] bg-[#fff4f4] px-4 py-3 text-sm text-[#a11a1a]">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map(({ merchant, role }) => (
          <article key={merchant.id} className="okado-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-sky-wash text-primary-action-accent"><Building2 className="h-5 w-5" /></div>
              {(() => {
                const missing = getMissingInformation(merchant);
                return missing.length ? (
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={() => void openAccountForLocation(merchant.id)}
                      disabled={openingLocationId !== null}
                      aria-busy={openingLocationId === merchant.id}
                      title={`Informations à compléter :\n${missing.map((item) => `• ${item}`).join("\n")}`}
                      aria-label={`Compléter les informations de ${merchant.companyName}: ${missing.join(", ")}`}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#fff4df] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9a5b00] transition hover:bg-[#ffebc2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7941d]/40 disabled:cursor-wait disabled:opacity-70"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" /> {openingLocationId === merchant.id ? "Ouverture..." : "À compléter"}
                    </button>
                    <div role="tooltip" className="pointer-events-none invisible absolute right-0 top-full z-20 mt-2 w-64 rounded-[12px] border border-[#e8d8b2] bg-[#fffaf0] p-3 text-left text-xs leading-5 text-[#75521d] opacity-0 shadow-[0_12px_30px_rgba(17,24,39,0.14)] transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                      <p className="font-semibold">Informations à compléter</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4">
                        {missing.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#047857]">Actif</span>
                );
              })()}
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-graphite">{merchant.companyName}</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-ash"><MapPin className="h-4 w-4" />{merchant.city || "Ville à renseigner"}</p>
            <div className="mt-5 flex items-center justify-between border-t border-[#edf0f4] pt-4"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-ash">{merchant.locationCode ?? merchant.id.slice(-6).toUpperCase()} · {role}</span>{items.length > 1 && ["owner", "admin"].includes(role) ? <button type="button" onClick={() => void archiveLocation(merchant.id)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a11a1a] hover:underline"><Archive className="h-3.5 w-3.5" />Archiver</button> : null}</div>
          </article>
        ))}
      </section>

      {isAdding ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-midnight-ink/30 p-3 backdrop-blur-sm md:items-center"><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-[var(--okado-radius-modal)] border border-border bg-sky-wash p-6 shadow-[var(--shadow-product-card)] md:p-8"><div className="flex items-start justify-between gap-4"><div><p className="okado-label">Nouveau site</p><h2 className="okado-section-title mt-2">Ajouter un établissement</h2></div><button type="button" onClick={() => setIsAdding(false)} aria-label="Fermer" className="rounded-full p-2 text-ash hover:bg-white"><X className="h-5 w-5" /></button></div><form onSubmit={addLocation} className="mt-6 space-y-4"><label className="block text-sm"><span className="mb-2 block text-ash">Nom du site</span><Input value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} required placeholder="Maison Sora République" /></label><label className="block text-sm"><span className="mb-2 block text-ash">Ville</span><Input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} required placeholder="Paris République" /></label><label className="block text-sm"><span className="mb-2 block text-ash">Adresse</span><Input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="12 rue..." /></label><label className="block text-sm"><span className="mb-2 block text-ash">Fuseau horaire</span><FieldSelect value={form.timeZone} onChange={(event) => setForm((current) => ({ ...current, timeZone: event.target.value }))}><option value="Europe/Paris">France métropolitaine</option><option value="America/Toronto">Canada - Est</option></FieldSelect></label><div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setIsAdding(false)} className="okado-secondary-action okado-compact-action px-4 text-sm">Annuler</button><button type="submit" disabled={isSaving} className="okado-filled-action okado-compact-action px-4 text-sm disabled:opacity-60">{isSaving ? "Création..." : "Créer le site"}</button></div></form></section></div> : null}
    </div>
  );
}
