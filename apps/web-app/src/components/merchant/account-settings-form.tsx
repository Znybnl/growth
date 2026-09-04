"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link2, ShieldCheck, Store, UserRound } from "lucide-react";

import { AccountSectionCard } from "@/components/merchant/account-section-card";
import { AccountLocationPanel } from "@/components/merchant/account-location-panel";
import { BillingSubscriptionCard } from "@/components/merchant/billing-subscription-card";
import { GoogleReviewPlacePicker } from "@/components/merchant/google-review-place-picker";
import { SocialChannelIcon } from "@/components/merchant/social-channel-icon";
import { Button } from "@/components/ui/button";
import { ValidationDialog } from "@/components/ui/validation-dialog";
import {
  INDUSTRY_OPTIONS,
  isRestaurantIndustry,
} from "@/lib/merchant-options";
import {
  Merchant,
  MerchantAccountSettingsInput,
  MerchantLocationAccess,
  MerchantUser,
  MerchantBillingSummary,
} from "@/lib/types";

type AccountSettingsFormProps = {
  merchant: Merchant;
  user: MerchantUser;
  locations: MerchantLocationAccess[];
  billing: MerchantBillingSummary;
  onDirtyChange?: (isDirty: boolean) => void;
};

type AccountTab = "establishment" | "user" | "subscription";

function accountTabFromHash(hash: string): AccountTab {
  const normalizedHash = hash.replace(/^#/, "");
  return normalizedHash === "account-user"
    ? "user"
    : normalizedHash === "account-subscription"
      ? "subscription"
      : "establishment";
}

const inputClass =
  "w-full min-h-[var(--okado-control-height)] rounded-[var(--okado-radius-control)] border border-fog bg-white px-4 py-2.5 text-sm text-carbon outline-none transition placeholder:text-ash focus:border-aubergine focus:shadow-[0_0_0_3px_rgba(97,31,105,0.14)]";

function createAccountSettingsForm(merchant: Merchant, user: MerchantUser): MerchantAccountSettingsInput {
  return {
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
    googlePlaceName: merchant.googlePlaceName ?? "",
    googlePlaceAddress: merchant.googlePlaceAddress ?? "",
    googlePlaceRating: merchant.googlePlaceRating,
    googlePlaceReviewCount: merchant.googlePlaceReviewCount,
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
  };
}

export function AccountSettingsForm({
  merchant,
  user,
  locations,
  billing,
  onDirtyChange,
}: AccountSettingsFormProps) {
  const [selectedLocationId, setSelectedLocationId] = useState(merchant.id);
  const [pendingLocationId, setPendingLocationId] = useState<string | null>(null);
  const [pendingTab, setPendingTab] = useState<AccountTab | null>(null);
  const [form, setForm] = useState<MerchantAccountSettingsInput>(() => createAccountSettingsForm(merchant, user));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const actionsAnchorRef = useRef<HTMLDivElement>(null);
  const [showStickyActions, setShowStickyActions] = useState(false);
  const [showOptionalChannels, setShowOptionalChannels] = useState(false);
  const activeTab = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("hashchange", onStoreChange);
      return () => window.removeEventListener("hashchange", onStoreChange);
    },
    () => accountTabFromHash(window.location.hash),
    () => "establishment" as AccountTab,
  );

  const selectedMerchant =
    selectedLocationId === merchant.id
      ? merchant
      : locations.find(({ merchant: location }) => location.id === selectedLocationId)?.merchant ?? merchant;

  function applyTabSelection(tab: AccountTab) {
    const nextHash = `#account-${tab === "establishment" ? "establishment" : tab === "user" ? "user" : "subscription"}`;
    window.history.replaceState(null, "", nextHash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  function selectTab(tab: AccountTab) {
    if (tab === activeTab) return;
    if (isDirty) {
      setPendingTab(tab);
      return;
    }
    applyTabSelection(tab);
  }

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const anchor = actionsAnchorRef.current;

    if (!anchor || typeof IntersectionObserver === "undefined") {
      return;
    }

    const scrollContainer = anchor.closest("main");
    const observer = new IntersectionObserver(
      ([entry]) => {
        // The top action anchor is below the account header and billing card. When the page opens,
        // it can be below the viewport without having been scrolled past; that
        // must not activate the sticky action bar prematurely. Only show it
        // after the anchor has crossed the top edge of the scroll area.
        const rootTop = entry.rootBounds?.top ?? 0;
        const hasScrolledPastAnchor = entry.boundingClientRect.top < rootTop;
        setShowStickyActions(!entry.isIntersecting && hasScrolledPastAnchor);
      },
      { threshold: 0, root: scrollContainer },
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  const isRestaurant = isRestaurantIndustry(form.industry);
  const placeLabel = isRestaurant ? "restaurant" : "commerce";
  const hasOptionalMarketingLink = Boolean(
    form.instagramUrl || form.facebookUrl || form.tiktokUrl || form.tripadvisorUrl || form.customLinkUrl,
  );
  const displayOptionalChannels = showOptionalChannels || hasOptionalMarketingLink;

  function applyLocationSelection(locationId: string) {
    const nextMerchant =
      locationId === merchant.id
        ? merchant
        : locations.find(({ merchant: location }) => location.id === locationId)?.merchant;

    if (!nextMerchant) return;

    setSelectedLocationId(locationId);
    setForm(createAccountSettingsForm(nextMerchant, user));
    setIsDirty(false);
    onDirtyChange?.(false);
    setError(null);
    setIsSuccessOpen(false);
    setPendingLocationId(null);
  }

  function requestLocationSelection(locationId: string) {
    if (locationId === selectedLocationId) return;

    if (isDirty) {
      setPendingLocationId(locationId);
      return;
    }

    applyLocationSelection(locationId);
  }

  function updateField<Key extends keyof MerchantAccountSettingsInput>(
    key: Key,
    value: MerchantAccountSettingsInput[Key],
  ) {
    if (!isDirty) {
      setIsDirty(true);
      onDirtyChange?.(true);
    }
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
        body: JSON.stringify({ ...form, locationId: selectedLocationId }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Mise à jour impossible.");
      }

      setIsDirty(false);
      onDirtyChange?.(false);
      setIsSuccessOpen(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Mise à jour impossible.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form id="account-settings-form" onSubmit={handleSubmit}>
      <div className="pointer-events-none sticky top-0 z-20 h-0 overflow-visible">
        <div
          className={`pointer-events-auto -mx-3 border-b border-lavender-mist bg-soft-white/95 px-3 py-2 shadow-[0_8px_18px_rgba(72,26,84,0.12)] backdrop-blur-sm transition-all duration-200 lg:-mx-6 lg:px-6 ${
            showStickyActions ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
          }`}
          aria-hidden={!showStickyActions}
        >
          <div className="okado-action-row flex w-full items-center justify-end gap-2">
            <Button
              type="submit"
              disabled={isSaving}
              tabIndex={showStickyActions ? 0 : -1}
              variant="primary"
              size="default"
              className="px-5"
            >
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>
      <div ref={actionsAnchorRef} className="h-px" aria-hidden="true" />
      <div className="space-y-6">
        <div role="tablist" aria-label="Sections du compte" className="flex gap-1 overflow-x-auto border-b border-lavender-mist bg-soft-white px-1 py-1">
          {([
            ["establishment", "Établissement"],
            ["user", "Utilisateur"],
            ["subscription", "Abonnement"],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              id={`account-${tab}-tab`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`account-tabpanel-${tab}`}
              tabIndex={activeTab === tab ? 0 : -1}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();
                const tabOrder: AccountTab[] = ["establishment", "user", "subscription"];
                const currentIndex = tabOrder.indexOf(tab);
                const offset = event.key === "ArrowRight" ? 1 : -1;
                const nextTab = tabOrder[(currentIndex + offset + tabOrder.length) % tabOrder.length];
                selectTab(nextTab);
                window.requestAnimationFrame(() => document.getElementById(`account-${nextTab}-tab`)?.focus());
              }}
              onClick={() => selectTab(tab)}
              className={`shrink-0 rounded-[4px] px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aubergine ${activeTab === tab ? "bg-purple-haze text-aubergine" : "text-ash hover:bg-[#f7f0fa] hover:text-aubergine"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "user" ? <div id="account-tabpanel-user" role="tabpanel" aria-labelledby="account-user-tab">
        <AccountSectionCard
        id="account-user"
        eyebrow="Mon compte"
        title="Informations de connexion"
        description="Ces informations identifient la personne qui administre le compte Okado."
        icon={UserRound}
      >
        <p className="mb-4 text-xs text-ash">
          <span className="text-coral-alert" aria-hidden="true">*</span> Champs obligatoires
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-2 block text-ash">
              Prénom <span className="text-coral-alert" aria-hidden="true">*</span>
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
              Nom <span className="text-coral-alert" aria-hidden="true">*</span>
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
              E-mail de connexion <span className="text-coral-alert" aria-hidden="true">*</span>
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
        </AccountSectionCard>
        </div> : null}

        {activeTab === "establishment" ? <div id="account-tabpanel-establishment" role="tabpanel" aria-labelledby="account-establishment-tab">
          <AccountLocationPanel
          merchant={selectedMerchant}
          locations={locations}
          onSelectLocation={requestLocationSelection}
          />

      <section className="okado-card scroll-mt-28 p-5 md:p-6">
        <div className="flex items-start gap-3 border-b border-border/70 pb-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[4px] bg-purple-haze text-aubergine">
            <Store className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="okado-label">Établissement sélectionné</p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-graphite">Configuration de {selectedMerchant.companyName}</h2>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm leading-6 text-ash"><Store className="h-4 w-4 shrink-0" aria-hidden="true" />{selectedMerchant.city || "Ville à renseigner"}{selectedMerchant.address ? ` · ${selectedMerchant.address}` : ""}</p>
          </div>
        </div>
        <div className="pt-5">
          <div id="account-location" className="scroll-mt-28">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-graphite">Informations générales</h3>
              <p className="mt-1 text-sm text-ash">Identité, coordonnées et paramètres de fonctionnement de l’établissement.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-2 block text-ash">
               Nom du commerce <span className="text-coral-alert" aria-hidden="true">*</span>
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
              Ville / {isRestaurant ? "restaurant" : "commerce"} <span className="text-coral-alert" aria-hidden="true">*</span>
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
          </div>

          <div id="account-channels" className="mt-8 scroll-mt-28 border-t border-border/70 pt-6">
            <div className="mb-4">
              <div className="flex items-center gap-2.5">
                <Link2 className="h-4 w-4 text-primary-action-accent" aria-hidden="true" />
                <h3 className="text-base font-semibold text-graphite">Liens marketing</h3>
              </div>
              <p className="mt-1 text-sm text-ash">Ajoutez les liens que vos participants pourront retrouver après leur participation.</p>
            </div>
            <div className="divide-y divide-fog">
            <GoogleReviewPlacePicker
              key={`${selectedLocationId}-${form.googleReviewUrl}`}
              className="md:col-span-2"
              value={form.googleReviewUrl}
              onChange={(nextUrl) => updateField("googleReviewUrl", nextUrl)}
              defaultQuery={form.companyName}
              city={form.city}
              compact
              allowManualInput={false}
              selectedPlace={form.googlePlaceName ? {
                name: form.googlePlaceName,
                address: form.googlePlaceAddress ?? "",
                rating: form.googlePlaceRating,
                reviewCount: form.googlePlaceReviewCount,
              } : null}
              onPlaceChange={(place) => {
                if (!isDirty) {
                  setIsDirty(true);
                  onDirtyChange?.(true);
                }
                setForm((current) => ({
                  ...current,
                  googlePlaceName: place.name,
                  googlePlaceAddress: place.address,
                  googlePlaceRating: place.rating ?? undefined,
                  googlePlaceReviewCount: place.reviewCount ?? undefined,
                }));
              }}
            />
            {!displayOptionalChannels ? (
              <button
                type="button"
                onClick={() => setShowOptionalChannels(true)}
                className="mt-2 inline-flex items-center gap-2 py-2 text-sm font-semibold text-aubergine underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aubergine"
              >
                + Ajouter un canal marketing
              </button>
            ) : null}
            {displayOptionalChannels ? <div className="grid gap-x-6 md:grid-cols-2">
          <label className="grid gap-2 border-b border-fog py-3 text-sm first:pt-0 md:grid-cols-[minmax(120px,0.42fr)_minmax(0,1fr)] md:items-center md:gap-3">
            <span className="flex items-center justify-between gap-3 text-charcoal"><span className="flex items-center gap-3"><SocialChannelIcon channel="instagram" /><span>Instagram</span></span>{form.instagramUrl ? <span className="text-xs font-semibold text-aubergine">✓</span> : <span className="text-xs text-ash">Optionnel</span>}</span>
            <input
              type="text"
              inputMode="url"
              value={form.instagramUrl}
              onChange={(event) => updateField("instagramUrl", event.target.value)}
              placeholder="https://instagram.com/..."
              className={`${inputClass} min-h-[40px] px-3 py-2 text-xs`}
            />
          </label>
          <label className="grid gap-2 border-b border-fog py-3 text-sm md:grid-cols-[minmax(120px,0.42fr)_minmax(0,1fr)] md:items-center md:gap-3">
            <span className="flex items-center justify-between gap-3 text-charcoal"><span className="flex items-center gap-3"><SocialChannelIcon channel="facebook" /><span>Facebook</span></span>{form.facebookUrl ? <span className="text-xs font-semibold text-aubergine">✓</span> : <span className="text-xs text-ash">Optionnel</span>}</span>
            <input
              type="text"
              inputMode="url"
              value={form.facebookUrl}
              onChange={(event) => updateField("facebookUrl", event.target.value)}
              placeholder="https://facebook.com/..."
              className={`${inputClass} min-h-[40px] px-3 py-2 text-xs`}
            />
          </label>
          <label className="grid gap-2 border-b border-fog py-3 text-sm md:grid-cols-[minmax(120px,0.42fr)_minmax(0,1fr)] md:items-center md:gap-3">
            <span className="flex items-center justify-between gap-3 text-charcoal"><span className="flex items-center gap-3"><SocialChannelIcon channel="tiktok" /><span>TikTok</span></span>{form.tiktokUrl ? <span className="text-xs font-semibold text-aubergine">✓</span> : <span className="text-xs text-ash">Optionnel</span>}</span>
            <input
              type="text"
              inputMode="url"
              value={form.tiktokUrl}
              onChange={(event) => updateField("tiktokUrl", event.target.value)}
              placeholder="https://tiktok.com/@..."
              className={`${inputClass} min-h-[40px] px-3 py-2 text-xs`}
            />
          </label>
          <label className="grid gap-2 border-b border-fog py-3 text-sm md:grid-cols-[minmax(120px,0.42fr)_minmax(0,1fr)] md:items-center md:gap-3">
            <span className="flex items-center justify-between gap-3 text-charcoal"><span className="flex items-center gap-3"><SocialChannelIcon channel="tripadvisor" /><span>Tripadvisor</span></span>{form.tripadvisorUrl ? <span className="text-xs font-semibold text-aubergine">✓</span> : <span className="text-xs text-ash">Optionnel</span>}</span>
            <input
              type="text"
              inputMode="url"
              value={form.tripadvisorUrl}
              onChange={(event) => updateField("tripadvisorUrl", event.target.value)}
              placeholder="https://tripadvisor.com/..."
              className={`${inputClass} min-h-[40px] px-3 py-2 text-xs`}
            />
          </label>
          <label className="grid gap-2 border-b border-fog py-3 text-sm md:grid-cols-[minmax(120px,0.42fr)_minmax(0,1fr)] md:items-center md:gap-3">
            <span className="flex items-center justify-between gap-3 text-charcoal"><span className="flex items-center gap-3"><SocialChannelIcon channel="custom" /><span>Lien personnalisé</span></span>{form.customLinkUrl ? <span className="text-xs font-semibold text-aubergine">✓</span> : <span className="text-xs text-ash">Optionnel</span>}</span>
            <input
              type="text"
              inputMode="url"
              value={form.customLinkUrl}
              onChange={(event) => updateField("customLinkUrl", event.target.value)}
              placeholder="https://..."
              className={`${inputClass} min-h-[40px] px-3 py-2 text-xs`}
            />
          </label>
            </div> : null}
            </div>
          </div>

          <div id="account-pin" className="mt-8 scroll-mt-28 border-t border-border/70 pt-6">
            <div className="mb-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-primary-action-accent" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ash">Sécurité du retrait</p>
                  <h3 className="mt-0.5 text-base font-semibold text-graphite">Code PIN de retrait</h3>
                </div>
              </div>
              <p className="mt-1 text-sm text-ash">Le PIN de {selectedMerchant.companyName} permet à un employé de valider un lot depuis le QR code.</p>
            </div>
            <p className="mb-5 max-w-2xl text-xs leading-5 text-ash">
              Le PIN doit contenir 4 à 6 chiffres et ne sera jamais affiché après son enregistrement.
            </p>
            <div className="grid gap-4 md:grid-cols-2 md:items-end">
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
              <p className="rounded-[8px] bg-purple-haze px-4 py-3 text-sm text-charcoal">
            {selectedMerchant.redemptionPinConfigured
              ? "Un PIN est déjà configuré. Laissez ce champ vide pour le conserver."
              : "Aucun PIN n’est configuré. Ajoutez-en un pour activer la validation express."}
              </p>
            </div>
          </div>
        </div>
      </section>
        </div> : null}

        {activeTab === "subscription" ? <div id="account-tabpanel-subscription" role="tabpanel" aria-labelledby="account-subscription-tab">
          <BillingSubscriptionCard billing={billing} />
        </div> : null}

      {error ? (
          <div className="rounded-[8px] border border-coral-alert/30 bg-coral-alert/10 px-4 py-3 text-sm text-coral-alert">
            {error}
          </div>
        ) : null}
      <ValidationDialog
        open={isSuccessOpen}
        title="Modifications enregistrées"
        description={`Les informations de ${selectedMerchant.companyName} ont bien été mises à jour.`}
        ctaLabel="Fermer"
        onClose={() => setIsSuccessOpen(false)}
      />
      </div>
      <ValidationDialog
        open={pendingLocationId !== null}
        title="Afficher cet établissement ?"
        description="Le formulaire inférieur sera rechargé avec les informations de l’établissement choisi. Votre établissement actif dans le reste de l’application ne changera pas."
        ctaLabel="Afficher l’établissement"
        onClose={() => setPendingLocationId(null)}
        onAction={() => {
          if (pendingLocationId) applyLocationSelection(pendingLocationId);
        }}
      />
      <ValidationDialog
        open={pendingTab !== null}
        title="Changer de section ?"
        description="Vos modifications non enregistrées seront conservées dans le formulaire, mais le changement de section peut modifier le périmètre visible."
        ctaLabel="Changer de section"
        onClose={() => setPendingTab(null)}
        onAction={() => {
          if (pendingTab) {
            const nextTab = pendingTab;
            setPendingTab(null);
            applyTabSelection(nextTab);
          }
        }}
      />
    </form>
  );
}
