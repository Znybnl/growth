"use client";

import { useEffect, useState } from "react";
import { CampaignEditor } from "@/components/merchant/campaign-editor";
import { CampaignLivePreview, buildCampaignLivePreviewModel } from "@/components/merchant/campaign-live-preview";
import { CampaignWizard } from "@/components/merchant/campaign-wizard";
import { PosterEditor } from "@/components/merchant/poster-editor";
import { EmailEditor } from "@/components/merchant/email-editor";
import { AccountSettingsForm } from "@/components/merchant/account-settings-form";
import { CampaignExperience } from "@/components/public/campaign-experience";
import { MerchantShell } from "@/components/merchant/merchant-shell";
import { DashboardRecentCampaigns } from "@/components/merchant/dashboard-recent-campaigns";
import { MetricCard, PageHeader } from "@/components/ui/workspace";
import { captureClientProductEvent, resetProductAnalytics } from "@/lib/client-product-analytics";
import { createDefaultPosterSettings, defaultScratchTextColor, wheelHeadingColorForTemplateSelection, wheelPaletteForTemplate } from "@/lib/campaign-defaults";
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
export function TemplateRenderingProof({ mode = "preview", templateId = "classic", background = "#ffffff", ink, font, secondary, business, button, buttonText, prizeCase, headline }: {
  mode?: string; templateId?: GamePageTemplateId; background?: string; ink?: string; font?: TextFont; secondary?: string; business?: string; button?: string; buttonText?: string; prizeCase?: string; headline?: string;
}) {
  if (mode === "analytics-identity") return <AnalyticsIdentityProof />;
  if (mode.startsWith("cookie-menu")) {
    const merchant: Merchant = { id: "cookie-menu-proof", companyName: "Maison de démonstration au nom très long",
      logoText: "Démo", onboardingCompleted: true, stripeSubscriptionStatus: "active", createdAt: "2026-10-01T00:00:00Z" };
    return <MerchantShell merchant={merchant} user={{ id: "cookie-menu-user", merchantId: merchant.id,
      firstName: "Camille", lastName: "Démo", email: "camille@example.test", password: "", createdAt: merchant.createdAt }}
      locations={[{ merchant, role: "owner" }]} activeLocationId={merchant.id} isSaasAdmin={mode === "cookie-menu-admin"}>
      <PageHeader eyebrow="Résultats" title="Résultats de démonstration" description="Données fictives pour vérifier les actions du menu." />
    </MerchantShell>;
  }
  const scratch = templateId.includes("scratch");
  const businessNames = { beauty: "Maison Botanique", restaurant: "Le bistro", retail: "La petite boutique" };
  const companyName = businessNames[business as keyof typeof businessNames] ?? "Établissement de test";
  const backgroundImage = background === "image" ? "/backgrounds/aurora-retail.svg" : background === "studio" ? "/backgrounds/soft-studio.svg" : "";
  const industry = business === "retail" || mode.includes("-retail") ? "Commerce" : business === "restaurant" ? "Restauration" : "Beauté";
  const merchant: Merchant = { id: "template-proof-merchant", companyName,
    logoText: companyName, industry, onboardingCompleted: true, createdAt: "2026-10-15T00:00:00Z" };
  const color = ink ?? (scratch ? defaultScratchTextColor(templateId) : wheelHeadingColorForTemplateSelection(templateId, "#ffffff"));
  const form = {
    ...halloweenFixture, id: "template-proof-campaign", merchantId: merchant.id,
    prizes: prizeCase === "headspa" ? [
      { ...halloweenFixture.prizes[0], id: "discount15", label: "-15% PRESTATION", probability: 15 },
      { ...halloweenFixture.prizes[0], id: "discount20", label: "-20% PRESTATION", probability: 10 },
      { ...halloweenFixture.prizes[0], id: "voucher", label: "5€ offert", probability: 10 },
      { ...halloweenFixture.prizes[0], id: "luxo", label: "une séance de luxopuncture", probability: 5 },
      { ...halloweenFixture.prizes[0], id: "headspa", label: "un soin headspa INTITION", probability: 5 },
    ] : halloweenFixture.prizes,
    title: "Jeu synthétique", subtitle: headline ?? (font ? "Une surprise élégante\nvous attend" : "Une surprise\nvous attend"), logoText: merchant.companyName,
    gameType: scratch ? "scratch" as const : "wheel" as const,
    accent: { ink: color, paper: "#ffffff", signal: "#b85be5" },
    presentation: {
      ...halloweenFixture.presentation,
      button: {
        ...halloweenFixture.presentation.button,
        ...(button ? { backgroundColor: button } : {}),
        ...(buttonText ? { textColor: buttonText } : {}),
      },
      background: { mode: backgroundImage ? "image" as const : "color" as const,
        color: backgroundImage ? "#ffffff" : background,
        imageUrl: backgroundImage },
      logo: { ...halloweenFixture.presentation.logo, textColor: color, marginBottomPx: business ? 64 : 20 },
      heading: { ...halloweenFixture.presentation.heading, textColor: color, fontSizePx: business === "retail" ? 34 : 40, fontFamily: font ?? "poppins" as const },
      wheel: wheelPaletteForTemplate(templateId, halloweenFixture.presentation.wheel),
      layout: { ...halloweenFixture.presentation.layout, templateId, blockSpacingPx: business && !scratch ? 64 : 25,
        scratchSubtitle: "Découvrez votre cadeau", wheelSubtitle: secondary ?? "" },
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
  if (mode.startsWith("dashboard-responsive")) {
    const marketing = mode === "dashboard-responsive-marketing";
    const titles = marketing ? ["Les surprises du bistro", "Le ticket du samedi", "La roue de bienvenue"] : ["Jeu de bienvenue", "Les surprises de l’automne — un nom de campagne volontairement très long pour vérifier le tableau", "Ticket du samedi", "Pause de saison", "Sans lot disponible", "Jeu sans dotation"];
    const campaigns = mode.endsWith("empty") ? [] : titles.map((title, index): CampaignPerformance => ({
      ...performance,
      campaign: { ...performance.campaign, id: `dashboard-fixture-${index}`, title, gameType: index % 2 ? "scratch" : "wheel", isActive: index !== 3 },
      prizes: index === 5 ? [] : performance.prizes.map((prize) => ({ ...prize, remainingQuantity: index >= 3 ? 0 : null })),
      kpis: { ...performance.kpis, scans: marketing ? 320 + index * 100 : index === 1 ? 12345678 : index === 5 ? 0 : 1200 + index,
        games: marketing ? 224 + index * 70 : index === 1 ? 9876543 : index === 5 ? 2 : 480 + index, conversionRate: marketing ? 70 : index === 5 ? 200 : 40 },
    }));
    return <MerchantShell merchant={merchant} user={{ id: "responsive-user", merchantId: merchant.id,
      role: "owner", firstName: "Camille", lastName: "Test", email: "responsive@example.test", password: "", createdAt: merchant.createdAt }}
      locations={[{ merchant, role: "owner" }]} activeLocationId={merchant.id} isSaasAdmin={false}>
      <div className="min-w-0 space-y-5">
        <PageHeader eyebrow="Vue d'ensemble" title="Pilotez vos campagnes"
          description={marketing ? "Exemple fictif · Vos jeux et leurs participations, en un regard." : "Données fictives pour le contrôle responsive de l’accueil."} />
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Campagnes actives" value={marketing ? "3" : "5"} /><MetricCard label="Participations" value={marketing ? "882" : "9 878 467"} />
          <MetricCard label="Lots consommés" value={marketing ? "60" : "182"} /><MetricCard label="Taux de consommation" value={marketing ? "40%" : "25%"} />
        </section>
        <DashboardRecentCampaigns campaigns={campaigns} />
      </div>
    </MerchantShell>;
  }
  if (mode === "email-tracking") return <EmailEditor campaign={performance.campaign} merchant={merchant} prizes={performance.prizes} />;
  if (mode === "editor-prize-budget") {
    return <MerchantShell merchant={merchant} user={{ id: "cost-user", merchantId: merchant.id,
      role: "owner", firstName: "Camille", lastName: "Test", email: "cost@example.test", password: "", createdAt: merchant.createdAt }}
      locations={[{ merchant, role: "owner" }]} activeLocationId={merchant.id} isSaasAdmin={false}>
      <CampaignEditor merchant={merchant} initialCampaign={performance} deferInlineAssets />
    </MerchantShell>;
  }
  if (mode.startsWith("wizard-responsive")) {
    const admin = mode.endsWith("admin");
    return <MerchantShell merchant={merchant} user={{ id: "responsive-user", merchantId: merchant.id,
      role: "owner", firstName: "Camille", lastName: "Test", email: "responsive@example.test", password: "", createdAt: merchant.createdAt }}
      locations={[{ merchant, role: "owner" }]} activeLocationId={merchant.id} isSaasAdmin={admin}>
      <CampaignWizard merchant={merchant} initialCampaign={mode.includes("create") ? undefined : {
        ...performance,
        campaign: { ...performance.campaign, ...(mode.includes("published") ? { isActive: true,
          actions: [{ id: "fixture-marketing", kind: "custom" as const, label: "Découvrir", url: "https://fixture.example.test" }] } : {}) },
      }}
        {...(admin ? { adminAccountMerchantId: "fixture-account", adminSaveEndpoint: "/api/admin/merchants/fixture-account/locations/template-proof-merchant/campaigns/setup" } : {})} />
    </MerchantShell>;
  }
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
        ...(mode === "wizard-actions-google" ? [{ id: "google-fixture", kind: "google" as const, label: "Écrire un avis", url: target.googleReviewUrl }] : []),
        { id: "legacy-instagram", kind: "instagram", label: "Notre compte personnalisé",
          url: mode === "wizard-actions-invalid" ? "http://instagram.com/fixture" : target.instagramUrl },
        { id: "legacy-website", kind: "custom", label: "Visiter le site", url: target.websiteUrl },
        ...(mode === "wizard-actions-legacy-booking" ? [{ id: "legacy-booking", kind: "custom" as const,
          label: "Prendre rendez-vous", url: target.appointmentUrl }] : []),
      ] } };
    if (mode === "editor-actions-empty") return <CampaignEditor merchant={target} initialCampaign={fixture} deferInlineAssets />;
    const wizard = <CampaignWizard merchant={target} initialCampaign={fixture}
      {...(mode === "wizard-actions-admin" ? { adminAccountMerchantId: "fixture-account",
        adminSaveEndpoint: "/api/admin/merchants/fixture-account/locations/template-proof-merchant/campaigns/setup" } : {})} />;
    if (mode === "wizard-actions-google") return <MerchantShell merchant={target} user={{ id: "fixture-user", merchantId: merchant.id,
      role: "owner", firstName: "Camille", lastName: "Test", email: "fixture@example.test", password: "", createdAt: merchant.createdAt }}
      locations={[{ merchant: target, role: "owner" }]} activeLocationId={merchant.id} isSaasAdmin={false}>{wizard}</MerchantShell>;
    return wizard;
  }
  if (mode === "poster-defaults") return <MerchantShell merchant={merchant} user={{ id: "poster-default-user", merchantId: merchant.id,
    role: "owner", firstName: "Camille", lastName: "Test", email: "poster@example.test", password: "", createdAt: merchant.createdAt }}
    locations={[{ merchant, role: "owner" }]} activeLocationId={merchant.id} isSaasAdmin={false}>
    <PosterEditor campaign={{ ...performance.campaign, presentation: { ...performance.campaign.presentation,
      poster: createDefaultPosterSettings(merchant) } }} prizes={performance.prizes} />
  </MerchantShell>;
  if (mode === "wizard-new") return <CampaignWizard merchant={merchant} />;
  if (mode === "wizard-custom-goal") return <CampaignWizard merchant={merchant} initialCampaign={{ ...performance,
    campaign: { ...performance.campaign, goalType: "social_follow", emailCaptureEnabled: true,
      successMetric: "Abonnements sociaux", targetUrl: "https://instagram.com/fixture-test",
      actions: [{ id: "fixture-instagram", kind: "instagram", url: "https://instagram.com/fixture-test", label: "Notre compte" }] },
  }} />;
  if (mode === "poster-download") return <MerchantShell merchant={merchant} user={{ id: "download-user", merchantId: merchant.id,
    role: "owner", firstName: "Camille", lastName: "Test", email: "download@example.test", password: "", createdAt: merchant.createdAt }}
    locations={[{ merchant, role: "owner" }]} activeLocationId={merchant.id} isSaasAdmin={false}>
    <PosterEditor campaign={performance.campaign} prizes={performance.prizes} />
  </MerchantShell>;
  if (mode.startsWith("public-google")) return <CampaignExperience campaignId={form.id} initialCampaign={{ ...publicCampaign,
    googleClickRequired: mode !== "public-google-optional", emailCaptureEnabled: false,
    actions: [{ id: "google-fixture", kind: mode === "public-google-other" ? "instagram" : "google", label: "Écrire un avis", url: "https://example.test/action" }] }} />;
  if (mode === "public" || mode === "live") return <CampaignExperience campaignId={form.id} initialCampaign={publicCampaign} />;
  if (mode === "game-preview") return <CampaignExperience campaignId={form.id} initialCampaign={publicCampaign} isPreview previewToken="fixture-only" />;
  if (mode === "wizard") return <CampaignWizard merchant={merchant} initialCampaign={performance} />;
  if (mode === "editor") return <CampaignEditor merchant={merchant} initialCampaign={performance} deferInlineAssets />;
  return <main style={{ maxWidth: 390, margin: "auto" }}>
    <CampaignLivePreview merchant={merchant} preview={buildCampaignLivePreviewModel(form, merchant)} compact />
  </main>;
}
