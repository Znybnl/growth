"use client";

import { useEffect, useRef, useState } from "react";

import { AffiliateReferralCard } from "@/components/merchant/affiliate-referral-card";
import { GoogleReviewPlacePicker } from "@/components/merchant/google-review-place-picker";
import { SocialChannelIcon } from "@/components/merchant/social-channel-icon";
import { ValidationDialog } from "@/components/ui/validation-dialog";
import {
  INDUSTRY_OPTIONS,
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
    redemptionPin: "",
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const actionsAnchorRef = useRef<HTMLDivElement>(null);
  const [showStickyActions, setShowStickyActions] = useState(false);

  useEffect(() => {
    const anchor = actionsAnchorRef.current;

    if (!anchor || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // The top action anchor is below the billing card. When the page opens,
        // it can be below the viewport without having been scrolled past; that
        // must not activate the sticky action bar prematurely. Only show it
        // after the anchor has crossed the top edge of the scroll area.
        const rootTop = entry.rootBounds?.top ?? 0;
        const hasScrolledPastAnchor = entry.boundingClientRect.top < rootTop;
        setShowStickyActions(!entry.isIntersecting && hasScrolledPastAnchor);
      },
      { threshold: 0, rootMargin: "-64px 0px 0px 0px" },
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  const isRestaurant = isRestaurantIndustry(form.industry);
  const placeLabel = isRestaurant ? "restaurant" : "commerce";

  function updateField<Key extends keyof MerchantAccountSettingsInput>(
    key: Key,
    value: MerchantAccountSettingsInput[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSuccessOpen(false);
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

      setIsSuccessOpen(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Mise à jour impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form id="account-settings-form" className="space-y-6" onSubmit={handleSubmit}>
      <div className="pointer-events-none sticky top-[-20px] z-20 hidden h-0 overflow-visible xl:-mb-6 xl:block">
        <div
          className={`pointer-events-auto -mx-3 border-b border-border bg-linen-canvas/95 px-3 py-2 shadow-[0_8px_18px_rgba(18,24,39,0.08)] backdrop-blur-sm transition-all duration-200 lg:-mx-6 lg:px-6 ${
            showStickyActions ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
          }`}
          aria-hidden={!showStickyActions}
        >
          <div className="okado-action-row mx-auto flex max-w-[1600px] items-center justify-end gap-2">
            <button
              type="submit"
              disabled={isSaving}
              tabIndex={showStickyActions ? 0 : -1}
              className="okado-filled-action px-5 disabled:opacity-60"
            >
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
      <div ref={actionsAnchorRef} className="h-px" aria-hidden="true" />
      <section className="okado-card p-6 md:p-8">
        <p className="okado-label">Utilisateur</p>
        <p className="mt-3 text-xs text-ash">
          <span className="text-[#b42318]" aria-hidden="true">*</span> Champs obligatoires
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-2 block text-ash">
              Prénom <span className="text-[#b42318]" aria-hidden="true">*</span>
            </span>
            <input
              value={form.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-ash">
              Nom <span className="text-[#b42318]" aria-hidden="true">*</span>
            </span>
            <input
              value={form.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-2 block text-ash">
              E-mail de connexion <span className="text-[#b42318]" aria-hidden="true">*</span>
            </span>
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
            <span className="mb-2 block text-ash">
              Nom du commerce <span className="text-[#b42318]" aria-hidden="true">*</span>
            </span>
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
          <label className="text-sm">
            <span className="mb-2 block text-ash">
              Ville / {isRestaurant ? "restaurant" : "commerce"} <span className="text-[#b42318]" aria-hidden="true">*</span>
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
              type="text"
              inputMode="url"
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
            <div className="mb-3 flex items-center gap-3 text-sm font-semibold text-graphite">
              <SocialChannelIcon channel="googleReview" />
              <span>Avis Google</span>
            </div>
            <GoogleReviewPlacePicker
              value={form.googleReviewUrl}
              onChange={(nextUrl) => updateField("googleReviewUrl", nextUrl)}
              defaultQuery={form.companyName}
              city={form.city}
              compact
              allowManualInput={false}
            />
          </div>
          <label className="text-sm">
            <span className="mb-2 flex items-center gap-3 text-ash"><SocialChannelIcon channel="instagram" /><span>Instagram</span></span>
            <input
              type="text"
              inputMode="url"
              value={form.instagramUrl}
              onChange={(event) => updateField("instagramUrl", event.target.value)}
              placeholder="https://instagram.com/..."
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 flex items-center gap-3 text-ash"><SocialChannelIcon channel="facebook" /><span>Facebook</span></span>
            <input
              type="text"
              inputMode="url"
              value={form.facebookUrl}
              onChange={(event) => updateField("facebookUrl", event.target.value)}
              placeholder="https://facebook.com/..."
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 flex items-center gap-3 text-ash"><SocialChannelIcon channel="tiktok" /><span>TikTok</span></span>
            <input
              type="text"
              inputMode="url"
              value={form.tiktokUrl}
              onChange={(event) => updateField("tiktokUrl", event.target.value)}
              placeholder="https://tiktok.com/@..."
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 flex items-center gap-3 text-ash"><SocialChannelIcon channel="tripadvisor" /><span>Tripadvisor</span></span>
            <input
              type="text"
              inputMode="url"
              value={form.tripadvisorUrl}
              onChange={(event) => updateField("tripadvisorUrl", event.target.value)}
              placeholder="https://tripadvisor.com/..."
              className={inputClass}
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-2 flex items-center gap-3 text-ash"><SocialChannelIcon channel="custom" /><span>Lien personnalisé</span></span>
            <input
              type="text"
              inputMode="url"
              value={form.customLinkUrl}
              onChange={(event) => updateField("customLinkUrl", event.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </label>
        </div>
      </section>

      <section className="okado-card p-6 md:p-8">
        <p className="okado-label">Validation express</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-graphite">
          PIN de validation du retrait
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-ash">
          Ce PIN permet à un employé de valider un lot depuis le QR code, sans se connecter à Okado.
          Il doit contenir 4 à 6 chiffres et ne sera jamais affiché après son enregistrement.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 md:items-end">
          <label className="text-sm">
            <span className="mb-2 block text-ash">Nouveau PIN commerçant</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              pattern="[0-9]{4,6}"
              maxLength={6}
              value={form.redemptionPin ?? ""}
              onChange={(event) => updateField("redemptionPin", event.target.value.replace(/\D/g, ""))}
              placeholder="4 à 6 chiffres"
              className={inputClass}
            />
          </label>
          <p className="rounded-[12px] border border-[#dbe4f0] bg-[#f8fafc] px-4 py-3 text-sm text-ash">
            {merchant.redemptionPinConfigured
              ? "Un PIN est déjà configuré. Laissez ce champ vide pour le conserver."
              : "Aucun PIN n’est configuré. Ajoutez-en un pour activer la validation express."}
          </p>
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
      <ValidationDialog
        open={isSuccessOpen}
        title="Vos modifications sont enregistrées"
        description="Les informations de votre compte et de votre établissement ont bien été mises à jour."
        ctaLabel="Fermer"
        onClose={() => setIsSuccessOpen(false)}
      />
    </form>
  );
}
