"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { GoogleReviewPlacePicker } from "@/components/merchant/google-review-place-picker";
import {
  beautySubsectorOptions,
  INDUSTRY_OPTIONS,
  isBeautyIndustry,
  isRestaurantIndustry,
} from "@/lib/merchant-options";
import { ONBOARDING_STEPS, shouldShowAppointmentUrl, validateOnboardingStep } from "@/lib/onboarding-configuration";
import { Merchant } from "@/lib/types";

const inputClass =
  "w-full rounded-[12px] border border-fog bg-white px-4 py-3 text-carbon outline-none transition focus:border-aubergine focus:shadow-[0_0_0_3px_rgba(97,31,105,0.16)]";

type OnboardingFlowProps = { merchant: Merchant };

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="mb-2 block text-charcoal">
      {children}{" "}
      {required ? (
        <>
          <span aria-hidden="true" className="font-semibold text-coral-alert">*</span>
          <span className="sr-only">(obligatoire)</span>
        </>
      ) : (
        <span className="text-ash">(facultatif)</span>
      )}
    </span>
  );
}

export function OnboardingFlow({ merchant }: OnboardingFlowProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [companyName, setCompanyName] = useState(merchant.onboardingCompleted ? merchant.companyName ?? "" : "");
  const [industry, setIndustry] = useState(merchant.industry ?? "");
  const [industrySubsector, setIndustrySubsector] = useState(merchant.industrySubsector ?? "");
  const [city, setCity] = useState(merchant.city ?? "");
  const [contactName, setContactName] = useState(merchant.contactName ?? "");
  const [restaurantType] = useState(merchant.onboardingCompleted ? merchant.restaurantType ?? "" : "");
  const [phone, setPhone] = useState(merchant.phone ?? "");
  const [appointmentUrl, setAppointmentUrl] = useState(merchant.appointmentUrl ?? "");
  const [address, setAddress] = useState(merchant.address ?? "");
  const defaultPrizeCost = merchant.defaultPrizeCost ?? 3;
  const [googleReviewUrl, setGoogleReviewUrl] = useState(merchant.googleReviewUrl ?? "");
  const [googlePlaceName, setGooglePlaceName] = useState(merchant.googlePlaceName ?? "");
  const [googlePlaceAddress, setGooglePlaceAddress] = useState(merchant.googlePlaceAddress ?? "");
  const [googlePlaceRating, setGooglePlaceRating] = useState<number | undefined>(merchant.googlePlaceRating);
  const [googlePlaceReviewCount, setGooglePlaceReviewCount] = useState<number | undefined>(merchant.googlePlaceReviewCount);
  const [instagramUrl, setInstagramUrl] = useState(merchant.instagramUrl ?? "");
  const [facebookUrl, setFacebookUrl] = useState(merchant.facebookUrl ?? "");
  const [tiktokUrl, setTiktokUrl] = useState(merchant.tiktokUrl ?? "");
  const [tripadvisorUrl, setTripadvisorUrl] = useState(merchant.tripadvisorUrl ?? "");
  const [redemptionPin, setRedemptionPin] = useState("0000");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const activeStep = ONBOARDING_STEPS[activeIndex];
  const isRestaurant = isRestaurantIndustry(industry);

  function validateStep(stepIndex: number) {
    return validateOnboardingStep(ONBOARDING_STEPS[stepIndex].id, { companyName, industry, city, redemptionPin });
  }

  function goToNextStep() {
    const validationError = validateStep(activeIndex);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setActiveIndex((current) => Math.min(current + 1, ONBOARDING_STEPS.length - 1));
  }

  async function saveOnboarding() {
    const profileError = validateStep(0);
    if (profileError) {
      setActiveIndex(0);
      setError(profileError);
      return;
    }
    const pinError = validateStep(ONBOARDING_STEPS.length - 1);
    if (pinError) {
      setError(pinError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          industry,
          industrySubsector,
          restaurantType,
          city,
          address,
          contactName,
          phone,
          // Keep previously saved contact details; this step is no longer part of onboarding.
          restaurantEmail: merchant.restaurantEmail ?? "",
          websiteUrl: merchant.websiteUrl ?? "",
          appointmentUrl,
          defaultPrizeCost,
          preferredGoals: [],
          diffusionSupport: [],
          googleReviewUrl,
          googlePlaceName,
          googlePlaceAddress,
          googlePlaceRating,
          googlePlaceReviewCount,
          instagramUrl,
          facebookUrl,
          tiktokUrl,
          tripadvisorUrl,
          redemptionPin,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(payload.error ?? "Onboarding impossible.");
      router.push("/?welcome=1");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Onboarding impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="okado-auth-onboarding okado-card p-6 sm:p-8">
      <div>
        <p className="okado-label">Bienvenue</p>
        <h1 className="okado-page-title mt-3">Préparez votre espace en 3 étapes</h1>
        <p className="mt-2 text-sm text-ash">
          Les champs marqués d’une <span className="font-semibold text-coral-alert">*</span> sont obligatoires ; les autres sont facultatifs.
        </p>
      </div>

      <div className="mt-8">
        <p className="okado-label">{activeStep.label}</p>
        <h2 className="okado-section-title mt-2">{activeStep.title}</h2>

        {activeStep.id === "profil" ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <FieldLabel required>Nom de l’enseigne</FieldLabel>
              <input required value={companyName} onChange={(event) => setCompanyName(event.target.value)} className={inputClass} />
            </label>
            <label className="text-sm">
              <FieldLabel required>Secteur d’activité</FieldLabel>
              <select
                required
                value={industry}
                onChange={(event) => {
                  const nextIndustry = event.target.value;
                  setIndustry(nextIndustry);
                  if (!isBeautyIndustry(nextIndustry)) setIndustrySubsector("");
                }}
                className={inputClass}
              >
                <option value="">Choisir un secteur</option>
                {INDUSTRY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            {isBeautyIndustry(industry) ? (
              <label className="text-sm">
                <FieldLabel>Sous-secteur</FieldLabel>
                <select
                  value={industrySubsector}
                  onChange={(event) => setIndustrySubsector(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Choisir un sous-secteur</option>
                  {beautySubsectorOptions(industrySubsector).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="text-sm">
              <FieldLabel required>Ville / {isRestaurant ? "restaurant" : "commerce"}</FieldLabel>
              <input required value={city} onChange={(event) => setCity(event.target.value)} className={inputClass} />
            </label>
            <label className="text-sm">
              <FieldLabel>Référent campagne</FieldLabel>
              <input value={contactName} onChange={(event) => setContactName(event.target.value)} className={inputClass} />
            </label>
          </div>
        ) : null}

        {activeStep.id === "reseaux" ? (
          <div>
            <p className="mt-4 text-sm leading-7 text-ash">Ces liens seront repris par défaut dans les actions marketing de vos futures campagnes.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="mb-2 text-sm text-charcoal">Avis Google <span className="text-ash">(facultatif)</span></p>
                <GoogleReviewPlacePicker
                  value={googleReviewUrl}
                  onChange={setGoogleReviewUrl}
                  defaultQuery={companyName}
                  city={city}
                  allowManualInput={false}
                  onAddressChange={setAddress}
                  onPhoneChange={setPhone}
                  selectedPlace={googlePlaceName ? {
                    name: googlePlaceName,
                    address: googlePlaceAddress,
                    rating: googlePlaceRating,
                    reviewCount: googlePlaceReviewCount,
                  } : null}
                  onPlaceChange={(place) => {
                    setGooglePlaceName(place.name);
                    setGooglePlaceAddress(place.address);
                    setGooglePlaceRating(place.rating ?? undefined);
                    setGooglePlaceReviewCount(place.reviewCount ?? undefined);
                  }}
                />
              </div>
              {shouldShowAppointmentUrl(industry) ? (
                <label className="text-sm md:col-span-2">
                  <FieldLabel>Lien de prise de rendez-vous</FieldLabel>
                  <input type="url" inputMode="url" maxLength={500} value={appointmentUrl} onChange={(event) => setAppointmentUrl(event.target.value)} placeholder="https://www.planity.com/..." className={inputClass} />
                  <span className="mt-2 block text-xs leading-5 text-ash">Planity ou votre outil de réservation. Vous pourrez aussi le renseigner plus tard dans Mon compte.</span>
                </label>
              ) : null}
              <label className="text-sm"><FieldLabel>Instagram</FieldLabel><input type="url" value={instagramUrl} onChange={(event) => setInstagramUrl(event.target.value)} placeholder="https://instagram.com/..." className={inputClass} /></label>
              <label className="text-sm"><FieldLabel>Facebook</FieldLabel><input type="url" value={facebookUrl} onChange={(event) => setFacebookUrl(event.target.value)} placeholder="https://facebook.com/..." className={inputClass} /></label>
              <label className="text-sm"><FieldLabel>TikTok</FieldLabel><input type="url" value={tiktokUrl} onChange={(event) => setTiktokUrl(event.target.value)} placeholder="https://tiktok.com/@..." className={inputClass} /></label>
              <label className="text-sm"><FieldLabel>Tripadvisor</FieldLabel><input type="url" value={tripadvisorUrl} onChange={(event) => setTripadvisorUrl(event.target.value)} placeholder="https://tripadvisor.com/..." className={inputClass} /></label>
            </div>
          </div>
        ) : null}

        {activeStep.id === "pin" ? (
          <div className="mt-6 max-w-xl">
            <label className="text-sm">
              <FieldLabel required>PIN de validation du retrait</FieldLabel>
              <input type="text" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4}" maxLength={4} minLength={4} required value={redemptionPin} onChange={(event) => setRedemptionPin(event.target.value.replace(/\D/g, ""))} className={inputClass} />
              <span className="mt-2 block text-xs leading-5 text-ash">Ce code de 4 chiffres est demandé à un employé pour valider un retrait. Il est prérempli à 0000 et pourra être modifié depuis Mon compte.</span>
            </label>
          </div>
        ) : null}

        {error ? <div className="mt-6 rounded-[8px] border border-coral-alert/30 bg-coral-alert/10 px-4 py-3 text-sm text-coral-alert">{error}</div> : null}

        <div className="mt-8 flex flex-col gap-3 border-t border-fog pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <button type="button" onClick={() => setActiveIndex((current) => Math.max(current - 1, 0))} disabled={activeIndex === 0} className="okado-primary-action px-5 disabled:opacity-40">Retour</button>
          </div>
          {activeIndex < ONBOARDING_STEPS.length - 1 ? (
            <button type="button" onClick={goToNextStep} className="okado-filled-action px-5">Étape suivante</button>
          ) : (
            <button type="button" onClick={saveOnboarding} disabled={isSaving} className="okado-filled-action px-5 disabled:opacity-60">{isSaving ? "Enregistrement…" : "Terminer"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
