"use client";

import { useState } from "react";

import { AffiliateReferralCard } from "@/components/merchant/affiliate-referral-card";
import { GoogleReviewPlacePicker } from "@/components/merchant/google-review-place-picker";
import {
  INDUSTRY_OPTIONS,
  RESTAURANT_TYPE_OPTIONS,
  businessLabel,
  isRestaurantIndustry,
} from "@/lib/merchant-options";
import {
  AffiliateSummary,
  Merchant,
  MerchantAccountSettingsInput,
  MerchantUser,
} from "@/lib/types";

type AccountSettingsFormProps = {
  merchant: Merchant;
  user: MerchantUser;
  affiliateSummary?: AffiliateSummary | null;
};

const inputClass =
  "w-full rounded-[12px] border border-[#cfcfcf] bg-white px-4 py-4 text-graphite outline-none transition focus:border-signal-blue focus:shadow-[0_0_0_3px_rgba(0,153,255,0.16)]";

export function AccountSettingsForm({
  merchant,
  user,
  affiliateSummary,
}: AccountSettingsFormProps) {
  const [form, setForm] = useState<MerchantAccountSettingsInput>({
    companyName: merchant.companyName,
    industry: merchant.industry ?? "Restauration",
    restaurantType: merchant.restaurantType ?? "Brasserie",
    city: merchant.city ?? "",
    address: merchant.address ?? "",
    contactName: merchant.contactName ?? "",
    phone: merchant.phone ?? "",
    restaurantEmail: merchant.restaurantEmail ?? "",
    websiteUrl: merchant.websiteUrl ?? "",
    googleReviewUrl: merchant.googleReviewUrl ?? "",
    instagramUrl: merchant.instagramUrl ?? "",
    facebookUrl: merchant.facebookUrl ?? "",
    tiktokUrl: merchant.tiktokUrl ?? "",
    tripadvisorUrl: merchant.tripadvisorUrl ?? "",
    customLinkUrl: merchant.customLinkUrl ?? "",
    timeZone: merchant.timeZone ?? "Europe/Paris",
    defaultPrizeCost: merchant.defaultPrizeCost ?? 3,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const placeLabel = businessLabel(form.industry);
  const isRestaurant = isRestaurantIndustry(form.industry);

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
      <section className="okado-card p-6 md:p-8">
        <p className="okado-label">Utilisateur</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-2 block text-ash">Prénom</span>
            <input
              value={form.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-ash">Nom</span>
            <input
              value={form.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-2 block text-ash">E-mail de connexion</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              className={inputClass}
              required
            />
          </label>
        </div>
      </section>

      <section className="okado-card p-6 md:p-8">
        <p className="okado-label">
          {isRestaurant ? "Restaurant" : "Commerce"}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-2 block text-ash">Nom du commerce</span>
            <input
              value={form.companyName}
              onChange={(event) => updateField("companyName", event.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-ash">Secteur d&apos;activité</span>
            <select
              value={form.industry}
              onChange={(event) => updateField("industry", event.target.value)}
              className={inputClass}
            >
              {INDUSTRY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {isRestaurant ? (
            <label className="text-sm">
              <span className="mb-2 block text-ash">Type de restaurant</span>
              <select
                value={form.restaurantType}
                onChange={(event) => updateField("restaurantType", event.target.value)}
                className={inputClass}
              >
                {RESTAURANT_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="text-sm">
            <span className="mb-2 block text-ash">
              Ville / {isRestaurant ? "restaurant" : "boutique"}
            </span>
            <input
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-ash">Fuseau horaire du commerce</span>
            <select
              value={form.timeZone}
              onChange={(event) => updateField("timeZone", event.target.value)}
              className={inputClass}
            >
              <option value="Europe/Paris">France métropolitaine</option>
              <option value="America/Toronto">Canada - Est</option>
              <option value="America/Winnipeg">Canada - Centre</option>
              <option value="America/Edmonton">Canada - Rocheuses</option>
              <option value="America/Vancouver">Canada - Pacifique</option>
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-2 block text-ash">Adresse</span>
            <input
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-ash">Contact principal</span>
            <input
              value={form.contactName}
              onChange={(event) => updateField("contactName", event.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-ash">
              Téléphone du {isRestaurant ? "restaurant" : placeLabel}
            </span>
            <input
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-ash">
              E-mail du {isRestaurant ? "restaurant" : placeLabel}
            </span>
            <input
              type="email"
              value={form.restaurantEmail}
              onChange={(event) => updateField("restaurantEmail", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-ash">
              Site internet du {isRestaurant ? "restaurant" : placeLabel}
            </span>
            <input
              type="url"
              value={form.websiteUrl}
              onChange={(event) => updateField("websiteUrl", event.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="okado-card p-6 md:p-8">
        <p className="okado-label">Canaux marketing</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <GoogleReviewPlacePicker
              value={form.googleReviewUrl}
              onChange={(nextUrl) => updateField("googleReviewUrl", nextUrl)}
              defaultQuery={form.companyName}
              city={form.city}
              allowManualInput={false}
            />
          </div>
          <label className="text-sm">
            <span className="mb-2 block text-ash">Instagram</span>
            <input
              type="url"
              value={form.instagramUrl}
              onChange={(event) => updateField("instagramUrl", event.target.value)}
              placeholder="https://instagram.com/..."
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-ash">Facebook</span>
            <input
              type="url"
              value={form.facebookUrl}
              onChange={(event) => updateField("facebookUrl", event.target.value)}
              placeholder="https://facebook.com/..."
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-ash">TikTok</span>
            <input
              type="url"
              value={form.tiktokUrl}
              onChange={(event) => updateField("tiktokUrl", event.target.value)}
              placeholder="https://tiktok.com/@..."
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-ash">Tripadvisor</span>
            <input
              type="url"
              value={form.tripadvisorUrl}
              onChange={(event) => updateField("tripadvisorUrl", event.target.value)}
              placeholder="https://tripadvisor.com/..."
              className={inputClass}
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-2 block text-ash">Lien personnalisé</span>
            <input
              type="url"
              value={form.customLinkUrl}
              onChange={(event) => updateField("customLinkUrl", event.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </label>
        </div>
      </section>

      {affiliateSummary?.account.status === "active" ? (
        <AffiliateReferralCard summary={affiliateSummary} />
      ) : (
        <section className="okado-card p-6 md:p-8">
          <p className="okado-label">Parrainage</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-graphite">
            Programme d&apos;affiliation
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-ash">
            Le programme d&apos;affiliation n&apos;est pas encore activé sur votre compte. Contactez{" "}
            <a className="okado-link" href="mailto:contact@okado.app">
              contact@okado.app
            </a>{" "}
            pour rejoindre le programme d&apos;affiliation.
          </p>
        </section>
      )}

      {error ? (
        <div className="rounded-[8px] border border-[#f6c4bb] bg-[#fff1ee] px-4 py-3 text-sm text-[#8b2c18]">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[8px] border border-[#cce7d5] bg-[#effaf3] px-4 py-3 text-sm text-[#1f7d53]">
          {success}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="okado-filled-action px-6 py-4 disabled:opacity-60"
        >
          {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </div>
    </form>
  );
}
