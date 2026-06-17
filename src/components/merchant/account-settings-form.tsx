"use client";

import { useState } from "react";

import { Merchant, MerchantAccountSettingsInput, MerchantUser } from "@/lib/types";

type AccountSettingsFormProps = {
  merchant: Merchant;
  user: MerchantUser;
};

export function AccountSettingsForm({ merchant, user }: AccountSettingsFormProps) {
  const [form, setForm] = useState<MerchantAccountSettingsInput>({
    companyName: merchant.companyName,
    industry: merchant.industry ?? "",
    city: merchant.city ?? "",
    contactName: merchant.contactName ?? "",
    phone: merchant.phone ?? "",
    websiteUrl: merchant.websiteUrl ?? "",
    googleReviewUrl: merchant.googleReviewUrl ?? "",
    instagramUrl: merchant.instagramUrl ?? "",
    defaultPrizeCost: merchant.defaultPrizeCost ?? 3,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateField<Key extends keyof MerchantAccountSettingsInput>(
    key: Key,
    value: MerchantAccountSettingsInput[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Mise à jour impossible.");
      }

      setSuccess("Compte mis à jour.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Mise à jour impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)] md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Utilisateur</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-2 block text-[#616b7c]">Prénom</span>
            <input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none" required />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-[#616b7c]">Nom</span>
            <input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none" required />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-2 block text-[#616b7c]">E-mail de connexion</span>
            <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none" required />
          </label>
        </div>
      </section>

      <section className="rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)] md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Boutique</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-2 block text-[#616b7c]">Nom du commerce</span>
            <input value={form.companyName} onChange={(event) => updateField("companyName", event.target.value)} className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none" required />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-[#616b7c]">Secteur d’activité</span>
            <input value={form.industry} onChange={(event) => updateField("industry", event.target.value)} placeholder="Mode, restauration, beauté, sport..." className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none" />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-[#616b7c]">Ville / boutique</span>
            <input value={form.city} onChange={(event) => updateField("city", event.target.value)} className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none" required />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-[#616b7c]">Contact principal</span>
            <input value={form.contactName} onChange={(event) => updateField("contactName", event.target.value)} className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none" required />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-[#616b7c]">Téléphone</span>
            <input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none" required />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-[#616b7c]">Site web</span>
            <input type="url" value={form.websiteUrl} onChange={(event) => updateField("websiteUrl", event.target.value)} placeholder="https://..." className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none" />
          </label>
        </div>
      </section>

      <section className="rounded-[32px] border border-[#dbe4f0] bg-white p-6 shadow-[0_18px_44px_rgba(122,136,166,0.1)] md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Canaux et paramètres</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-2 block text-[#616b7c]">URL avis Google</span>
            <input type="url" value={form.googleReviewUrl} onChange={(event) => updateField("googleReviewUrl", event.target.value)} placeholder="https://g.page/..." className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none" />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-[#616b7c]">Instagram</span>
            <input type="url" value={form.instagramUrl} onChange={(event) => updateField("instagramUrl", event.target.value)} placeholder="https://instagram.com/..." className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none" />
          </label>
          <label className="text-sm md:max-w-[260px]">
            <span className="mb-2 block text-[#616b7c]">Coût par lot par défaut (€)</span>
            <input type="number" min="0" step="0.1" value={form.defaultPrizeCost} onChange={(event) => updateField("defaultPrizeCost", Number(event.target.value || 0))} className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-4 outline-none" />
          </label>
        </div>
      </section>

      {error ? <div className="rounded-[20px] border border-[#f6c4bb] bg-[#fff1ee] px-4 py-3 text-sm text-[#8b2c18]">{error}</div> : null}
      {success ? <div className="rounded-[20px] border border-[#cce7d5] bg-[#effaf3] px-4 py-3 text-sm text-[#1f7d53]">{success}</div> : null}

      <div className="flex justify-end">
        <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center rounded-[22px] bg-[#2f6df6] px-6 py-4 text-sm font-semibold !text-white shadow-[0_16px_32px_rgba(47,109,246,0.24)] disabled:opacity-60">
          {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </div>
    </form>
  );
}
