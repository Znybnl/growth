"use client";

import { useEffect, useState } from "react";
import { CampaignEditor } from "@/components/merchant/campaign-editor";
import { CampaignLivePreview, buildCampaignLivePreviewModel } from "@/components/merchant/campaign-live-preview";
import { CampaignWizard } from "@/components/merchant/campaign-wizard";
import { AccountSettingsForm } from "@/components/merchant/account-settings-form";
import { CampaignExperience } from "@/components/public/campaign-experience";
import { MerchantShell } from "@/components/merchant/merchant-shell";
import { captureClientProductEvent, resetProductAnalytics } from "@/lib/client-product-analytics";
import { defaultScratchTextColor, wheelHeadingColorForTemplateSelection, wheelPaletteForTemplate } from "@/lib/campaign-defaults";
import type { CampaignPerformance, GamePageTemplateId, Merchant, PublicCampaign, TextFont } from "@/lib/types";
import { halloweenFixture } from "./halloween-wheel";

function AnalyticsIdentityMountEvent() {
  useEffect(() => { captureClientProductEvent("campaign_creation_started"); }, []);
  return null;
}

function AnalyticsIdentityProof() {
  const [site, setSite] = useState("merchant-location-a");
  const [otherUser, setOtherUser] = useState(false);
  const [profileEmail, setProfileEmail] = useState("fixture@example.test");
  const merchant: Merchant = { id: site, companyName: "Établissement fictif", industry: "Beauté", logoText: "Test",
    onboardingCompleted: true, createdAt: "2026-10-18T00:00:00Z" };
  return <MerchantShell merchant={merchant} user={{ id: otherUser ? "user-other-fixture" : "user-identity-fixture",
    merchantId: otherUser ? "merchant-other-account" : "merchant-primary", role: "owner", firstName: "Camille", lastName: "Test",
    email: otherUser ? "other-fixture@example.test" : profileEmail, password: "", createdAt: merchant.createdAt }}
    locations={[{ merchant, role: "owner" }]} activeLocationId={site} isSaasAdmin={false}>
    <AnalyticsIdentityMountEvent />
    <div className="space-y-4">
      <h1>Vérification de l’identité — données fictives</h1>
      <button type="button" onClick={() => setSite(site === "merchant-location-a" ? "merchant-location-b" : "merchant-location-a")}>Changer d’établissement</button>
      <button type="button" onClick={() => captureClientProductEvent("campaign_preview_opened")}>Capturer un événement fictif</button>
      <button type="button" onClick={() => resetProductAnalytics()}>Simuler une identité effacée</button>
      <button type="button" onClick={() => setOtherUser(!otherUser)}>Changer d’utilisateur fictif</button>
      <button type="button" onClick={() => setProfileEmail("updated-fixture@example.test")}>Modifier l’e-mail fictif</button>
      <p data-testid="identity-active-site">{site}</p>
    </div>
  </MerchantShell>;
}

/** Synthetic rendering only: tests intercept every API request, no session bypass. */
export function TemplateRenderingProof({ mode = "preview", templateId = "classic", background = "#ffffff", ink, font }: {
  mode?: string; templateId?: GamePageTemplateId; background?: string; ink?: string; font?: TextFont;
}) {
  if (mode === "analytics-identity") return <AnalyticsIdentityProof />;
  const scratch = templateId.includes("scratch");
  const merchant: Merchant = { id: "template-proof-merchant", companyName: "Établissement de test",
    logoText: "Établissement de test", industry: "Beauté", onboardingCompleted: true, createdAt: "2026-10-15T00:00:00Z" };
  const color = ink ?? (scratch ? defaultScratchTextColor(templateId) : wheelHeadingColorForTemplateSelection(templateId, "#ffffff"));
  const form = {
    ...halloweenFixture, id: "template-proof-campaign", merchantId: merchant.id,
    title: "Jeu synthétique", subtitle: font ? "Une surprise élégante\nvous attend" : "Une surprise\nvous attend", logoText: merchant.companyName,
    gameType: scratch ? "scratch" as const : "wheel" as const,
    accent: { ink: color, paper: "#ffffff", signal: "#b85be5" },
    presentation: {
      ...halloweenFixture.presentation,
      background: { mode: background === "image" ? "image" as const : "color" as const,
        color: background === "image" ? "#ffffff" : background,
        imageUrl: background === "image" ? "/backgrounds/aurora-retail.svg" : "" },
      logo: { ...halloweenFixture.presentation.logo, textColor: color, marginBottomPx: 20 },
      heading: { ...halloweenFixture.presentation.heading, textColor: color, fontSizePx: 40, fontFamily: font ?? "poppins" as const },
      wheel: wheelPaletteForTemplate(templateId, halloweenFixture.presentation.wheel),
      layout: { ...halloweenFixture.presentation.layout, templateId, blockSpacingPx: 25,
        scratchSubtitle: "Découvrez votre cadeau", wheelSubtitle: "" },
    },
  };
  const publicCampaign: PublicCampaign = { ...form, merchantName: merchant.companyName, merchantLogoText: merchant.logoText,
    prizes: form.prizes.map(prize => ({ ...prize, id: prize.id!, remainingQuantity: null, purchaseRequired: false })) };
  const performance: CampaignPerformance = { merchant,
    campaign: { ...form, createdAt: merchant.createdAt },
    prizes: publicCampaign.prizes.map(prize => ({ ...prize, campaignId: form.id, estimatedUnitCost: 0 })),
    kpis: { scans: 0, contacts: 0, optIns: 0, leads: 0, actions: 0, games: 0, wins: 0, redeemed: 0,
      conversionRate: 0, actionRate: 0, redemptionRate: 0, estimatedSpend: 0, costPerLead: 0, costPerRedeemed: 0 },
  };
  if (mode === "account-marketing") {
    const accountMerchant = { ...merchant, city: "Reims", address: "1 rue de Test", contactName: "Camille Test",
      websiteUrl: "https://fixture.example.test", appointmentUrl: "https://booking.example.test",
      googleReviewUrl: "https://search.google.com/local/writereview?placeid=fixture",
      googlePlaceName: "Établissement de test", googlePlaceAddress: "1 rue de Test, Reims",
      instagramUrl: "https://www.instagram.com/fixture/" };
    return <main className="mx-auto h-dvh w-full min-w-0 max-w-5xl overflow-x-hidden overflow-y-auto p-4 sm:p-6"><AccountSettingsForm merchant={accountMerchant}
      user={{ id: "fixture-user", merchantId: merchant.id, role: "owner", firstName: "Camille", lastName: "Test",
        email: "fixture@example.test", password: "", createdAt: merchant.createdAt }}
      locations={[{ merchant: accountMerchant, role: "owner" }]}
      redemptionPinStates={{ [merchant.id]: { value: "1234", configured: true, recoverable: true } }}
      billing={{ subscriptionCancelAtPeriodEnd: false, hasPaymentMethodOnFile: false, isTrialActive: true,
        isSubscribed: false, isPastDue: false, isBillingLocked: false, daysLeftInTrial: 10 }} />
    </main>;
  }
  if (mode.startsWith("wizard-actions") || mode === "editor-actions-empty") {
    const target = { ...merchant, industry: "Restauration", googleReviewUrl: "https://g.page/r/fixture",
      instagramUrl: "https://www.instagram.com/fixture/", websiteUrl: "https://fixture.example.test",
      appointmentUrl: "https://booking.example.test",
      ...(mode.includes("custom-configured") ? { customLinkUrl: "https://saved-link.example.test" } : {}) };
    const empty = mode.includes("empty");
    const fixture: CampaignPerformance = { ...performance, merchant: target,
      campaign: { ...performance.campaign, actions: empty ? [] : [
        { id: "legacy-instagram", kind: "instagram", label: "Notre compte personnalisé",
          url: mode === "wizard-actions-invalid" ? "http://instagram.com/fixture" : target.instagramUrl },
        { id: "legacy-website", kind: "custom", label: "Visiter le site", url: target.websiteUrl },
        ...(mode === "wizard-actions-legacy-booking" ? [{ id: "legacy-booking", kind: "custom" as const,
          label: "Prendre rendez-vous", url: target.appointmentUrl }] : []),
      ] } };
    if (mode === "editor-actions-empty") return <CampaignEditor merchant={target} initialCampaign={fixture} deferInlineAssets />;
    return <CampaignWizard merchant={target} initialCampaign={fixture}
      {...(mode === "wizard-actions-admin" ? { adminAccountMerchantId: "fixture-account",
        adminSaveEndpoint: "/api/admin/merchants/fixture-account/locations/template-proof-merchant/campaigns/setup" } : {})} />;
  }
  if (mode === "wizard-new") return <CampaignWizard merchant={merchant} />;
  if (mode === "wizard-custom-goal") return <CampaignWizard merchant={merchant} initialCampaign={{ ...performance,
    campaign: { ...performance.campaign, goalType: "social_follow", emailCaptureEnabled: true,
      successMetric: "Abonnements sociaux", targetUrl: "https://instagram.com/fixture-test",
      actions: [{ id: "fixture-instagram", kind: "instagram", url: "https://instagram.com/fixture-test", label: "Notre compte" }] },
  }} />;
  if (mode === "public") return <CampaignExperience campaignId={form.id} initialCampaign={publicCampaign} />;
  if (mode === "game-preview") return <CampaignExperience campaignId={form.id} initialCampaign={publicCampaign} isPreview previewToken="fixture-only" />;
  if (mode === "wizard") return <CampaignWizard merchant={merchant} initialCampaign={performance} />;
  if (mode === "editor") return <CampaignEditor merchant={merchant} initialCampaign={performance} deferInlineAssets />;
  return <main style={{ maxWidth: 390, margin: "auto" }}>
    <CampaignLivePreview merchant={merchant} preview={buildCampaignLivePreviewModel(form, merchant)} compact />
  </main>;
}
