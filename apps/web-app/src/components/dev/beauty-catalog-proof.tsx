"use client";

import { useState } from "react";
import { CampaignWizard } from "@/components/merchant/campaign-wizard";
import { CampaignEditor } from "@/components/merchant/campaign-editor";
import { OnboardingFlow } from "@/components/auth/onboarding-flow";
import { PrizeSuggestionsManager } from "@/components/merchant/prize-suggestions-manager";
import { BEAUTY_SUBSECTOR_OPTIONS, beautySubsectorOptions } from "@/lib/merchant-options";
import { createDefaultPosterSettings, createDefaultWheelSettings } from "@/lib/campaign-defaults";
import { createCampaignEmailDefaults } from "@/lib/email-settings";
import catalog from "@/lib/beauty-catalog-466.fixture.json";
import type { CampaignPerformance, Merchant, PrizeSuggestion } from "@/lib/types";

const createdAt = "2026-10-06T00:00:00.000Z";

function fixture(merchant: Merchant): CampaignPerformance {
  return {
    merchant,
    campaign: {
      id: "catalog-campaign-fixture", merchantId: merchant.id,
      title: "Campagne de test catalogue", subtitle: "Tournez la roue", goalType: null,
      emailCaptureEnabled: false, ctaLabel: "Jouer", successMetric: "Participations",
      isActive: false, createdAt, gameType: "wheel", logoMode: "text", logoText: merchant.logoText,
      accent: { ink: "#583A46", paper: "#FFFDFC", signal: "#B95F75" },
      actions: [],
      rewardRules: { rewardExpiryMinutes: 20, purchaseRequired: false, availableAfterHours: 0,
        availabilityDurationDays: 30, participationIntervalDays: 1, isWinningEveryTime: false },
      presentation: {
        logo: { sizePercent: 100, marginBottomPx: 20, align: "center", textColor: "#583A46" },
        background: { mode: "color", color: "#FFFDFC" },
        heading: { textColor: "#583A46", fontSizePx: 42, fontFamily: "playfair", align: "center" },
        button: { backgroundColor: "#B95F75", textColor: "#FFFFFF", borderColor: "#B95F75",
          size: "md", textSizePx: 24, isBold: true },
        layout: { templateId: "rose-institut", blockSpacingPx: 25, subtitleSpacingPx: 15 },
        wheel: createDefaultWheelSettings(), poster: createDefaultPosterSettings(merchant),
        email: createCampaignEmailDefaults(merchant),
      },
    },
    prizes: [{ id: "existing-prize-fixture", campaignId: "catalog-campaign-fixture",
      label: "LOT EXISTANT À PRÉSERVER", totalQuantity: 9, remainingQuantity: 7,
      probability: 10, estimatedUnitCost: 6, purchaseRequired: false, usageConditions: "Condition existante inchangée" }],
    kpis: { scans: 0, contacts: 0, optIns: 0, leads: 0, actions: 0, games: 0, wins: 0, redeemed: 0,
      conversionRate: 0, actionRate: 0, redemptionRate: 0, estimatedSpend: 0, costPerLead: 0, costPerRedeemed: 0 },
  };
}

/** Synthetic UI only. No session bypass: browser tests intercept API requests. */
export function BeautyCatalogProof() {
  const [subsector, setSubsector] = useState<string>(BEAUTY_SUBSECTOR_OPTIONS[0]);
  const [mode, setMode] = useState("wizard");
  const merchant: Merchant = { id: "catalog-merchant-fixture", companyName: "Institut de test",
    logoText: "Institut de test", industry: "Beauté", industrySubsector: subsector,
    onboardingCompleted: true, createdAt };
  const initialCampaign = fixture(merchant);
  return <main className="p-4">
    <div className="mb-5 flex flex-wrap gap-4">
      <label>Interface <select aria-label="Interface" value={mode} onChange={(event) => setMode(event.target.value)}>
        <option value="wizard">Wizard</option><option value="classic">Classique</option>
        <option value="profile">Profil</option><option value="admin">Catalogue administrateur</option>
      </select></label>
      <label>Activité de test <select aria-label="Activité de test" value={subsector} onChange={(event) => setSubsector(event.target.value)}>
        {beautySubsectorOptions("Institut & soins", "Ongles & cils").map((value) => <option key={value}>{value}</option>)}
      </select></label>
    </div>
    {mode === "wizard" ? <CampaignWizard merchant={merchant} initialCampaign={initialCampaign} /> : null}
    {mode === "classic" ? <CampaignEditor merchant={merchant} initialCampaign={initialCampaign} deferInlineAssets /> : null}
    {mode === "profile" ? <OnboardingFlow key={subsector} merchant={merchant} /> : null}
    {mode === "admin" ? <PrizeSuggestionsManager initialSuggestions={catalog.map((item) => ({
      ...item, icon: item.icon as PrizeSuggestion["icon"], isActive: true, createdAt, updatedAt: createdAt,
    }))} /> : null}
  </main>;
}
