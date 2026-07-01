"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  INDUSTRY_OPTIONS,
  RESTAURANT_TYPE_OPTIONS,
  businessLabel,
  isRestaurantIndustry,
} from "@/lib/merchant-options";
import { GoogleReviewPlacePicker } from "@/components/merchant/google-review-place-picker";
import { Merchant } from "@/lib/types";

const steps = [
  {
    id: "profil",
    label: "Profil",
    title: "Informations de base",
  },
  {
    id: "restaurant",
    label: "Information restaurant",
    title: "Coordonnées du restaurant",
  },
  {
    id: "reseaux",
    label: "Liens marketing",
    title: "Liens repris dans vos campagnes",
  },
] as const;

type OnboardingFlowProps = {
  merchant: Merchant;
};

export function OnboardingFlow({ merchant }: OnboardingFlowProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [companyName, setCompanyName] = useState(merchant.companyName ?? "");
  const [industry, setIndustry] = useState(merchant.industry ?? "Restauration");
  const [city, setCity] = useState(merchant.city ?? "");
  const [contactName, setContactName] = useState(merchant.contactName ?? "");
  const [restaurantType, setRestaurantType] = useState(
    merchant.restaurantType ?? "Brasserie",
  );
  const [phone, setPhone] = useState(merchant.phone ?? "");
  const [restaurantEmail, setRestaurantEmail] = useState(merchant.restaurantEmail ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(merchant.websiteUrl ?? "");
  const [address, setAddress] = useState(merchant.address ?? "");
  const defaultPrizeCost = merchant.defaultPrizeCost ?? 3;
  const [googleReviewUrl, setGoogleReviewUrl] = useState(merchant.googleReviewUrl ?? "");
  const [instagramUrl, setInstagramUrl] = useState(merchant.instagramUrl ?? "");
  const [facebookUrl, setFacebookUrl] = useState(merchant.facebookUrl ?? "");
  const [tiktokUrl, setTiktokUrl] = useState(merchant.tiktokUrl ?? "");
  const [tripadvisorUrl, setTripadvisorUrl] = useState(merchant.tripadvisorUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const activeStep = steps[activeIndex];
  const placeLabel = businessLabel(industry);
  const isRestaurant = isRestaurantIndustry(industry);

  function goNext() {
    setActiveIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setActiveIndex((current) => Math.max(current - 1, 0));
  }

  async function saveOnboarding() {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          industry,
          restaurantType,
          city,
          address,
          contactName,
          phone,
          restaurantEmail,
          websiteUrl,
          defaultPrizeCost,
          preferredGoals: [],
          diffusionSupport: [],
          googleReviewUrl,
          instagramUrl,
          facebookUrl,
          tiktokUrl,
          tripadvisorUrl,
          customUrl: "",
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Onboarding impossible.");
      }

      router.push("/campaigns/new");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Onboarding impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6 px-1 py-2 sm:px-5 sm:py-4">
      <div className="rounded-[36px] border border-[#dbe4f0] bg-white/90 p-6 shadow-[0_28px_60px_rgba(108,126,156,0.16)]">
        <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">Bienvenue</p>
        <h1 className="mt-3 font-display text-5xl leading-[0.94] text-[#121826]">
          Préparez votre espace en 3 étapes
        </h1>
      </div>

      <div className="rounded-[34px] border border-[#dbe4f0] bg-white p-6 shadow-[0_28px_60px_rgba(108,126,156,0.12)]">
        <p className="text-xs uppercase tracking-[0.28em] text-[#7b8496]">{activeStep.label}</p>
        <h2 className="mt-2 text-3xl font-semibold text-[#111827]">{activeStep.title}</h2>

        {activeStep.id === "profil" ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Nom de l’enseigne</span>
              <input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Secteur d’activité</span>
              <select
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              >
                {INDUSTRY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">
                Ville / {isRestaurant ? "restaurant" : "boutique"}
              </span>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Référent campagne</span>
              <input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>
          </div>
        ) : null}

        {activeStep.id === "restaurant" ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">
                Type de {isRestaurant ? "restaurant" : placeLabel}
              </span>
              <select
                value={restaurantType}
                onChange={(event) => setRestaurantType(event.target.value)}
                className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              >
                {RESTAURANT_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Téléphone du restaurant</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">E-mail du restaurant</span>
              <input
                type="email"
                value={restaurantEmail}
                onChange={(event) => setRestaurantEmail(event.target.value)}
                className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="mb-2 block text-[#616b7c]">Site internet du restaurant</span>
              <input
                type="url"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://..."
                className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-2 block text-[#616b7c]">Adresse</span>
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
              />
            </label>
          </div>
        ) : null}

        {activeStep.id === "reseaux" ? (
          <div>
            <p className="mt-4 text-sm leading-7 text-[#5c6577]">
              Ces liens seront repris par défaut dans les actions marketing de vos futures
              campagnes.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <GoogleReviewPlacePicker
                  value={googleReviewUrl}
                  onChange={setGoogleReviewUrl}
                  defaultQuery={companyName}
                  city={city}
                />
              </div>
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Instagram</span>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(event) => setInstagramUrl(event.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">Facebook</span>
                <input
                  type="url"
                  value={facebookUrl}
                  onChange={(event) => setFacebookUrl(event.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>
              <label className="text-sm">
                <span className="mb-2 block text-[#616b7c]">TikTok</span>
                <input
                  type="url"
                  value={tiktokUrl}
                  onChange={(event) => setTiktokUrl(event.target.value)}
                  placeholder="https://tiktok.com/@..."
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block text-[#616b7c]">Tripadvisor</span>
                <input
                  type="url"
                  value={tripadvisorUrl}
                  onChange={(event) => setTripadvisorUrl(event.target.value)}
                  placeholder="https://tripadvisor.com/..."
                  className="w-full rounded-[20px] border border-[#d7e0ed] bg-[#f7f9fc] px-4 py-3 outline-none"
                />
              </label>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-[20px] border border-[#f6c4bb] bg-[#fff1ee] px-4 py-3 text-sm text-[#8b2c18]">
            {error}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 border-t border-[#e6ebf2] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={activeIndex === 0}
              className="rounded-[20px] border border-[#d7e0ed] px-5 py-3 text-sm font-semibold text-[#182033] disabled:opacity-40"
            >
              Retour
            </button>
            <Link
              href="/campaigns/new"
              className="rounded-[20px] border border-[#d7e0ed] px-5 py-3 text-sm font-semibold text-[#182033]"
            >
              Passer
            </Link>
          </div>

          {activeIndex < steps.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-[20px] bg-[#2f6df6] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(47,109,246,0.22)]"
            >
              Étape suivante
            </button>
          ) : (
            <button
              type="button"
              onClick={saveOnboarding}
              disabled={isSaving}
              className="rounded-[20px] bg-[#121826] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(18,24,38,0.16)] disabled:opacity-60"
            >
              {isSaving ? "Enregistrement..." : "Terminer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
