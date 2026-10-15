"use client";

import { CampaignEditor } from "@/components/merchant/campaign-editor";
import { CampaignLivePreview, buildCampaignLivePreviewModel } from "@/components/merchant/campaign-live-preview";
import { CampaignWizard } from "@/components/merchant/campaign-wizard";
import { CampaignExperience } from "@/components/public/campaign-experience";
import { defaultScratchTextColor, wheelHeadingColorForTemplateSelection, wheelPaletteForTemplate } from "@/lib/campaign-defaults";
import type { CampaignPerformance, GamePageTemplateId, Merchant, PublicCampaign } from "@/lib/types";
import { halloweenFixture } from "./halloween-wheel";

/** Synthetic rendering only: tests intercept every API request, no session bypass. */
export function TemplateRenderingProof({ mode = "preview", templateId = "classic", background = "#ffffff", ink }: {
  mode?: string; templateId?: GamePageTemplateId; background?: string; ink?: string;
}) {
  const scratch = templateId.includes("scratch");
  const merchant: Merchant = { id: "template-proof-merchant", companyName: "Établissement de test",
    logoText: "Établissement de test", industry: "Beauté", onboardingCompleted: true, createdAt: "2026-10-15T00:00:00Z" };
  const color = ink ?? (scratch ? defaultScratchTextColor(templateId) : wheelHeadingColorForTemplateSelection(templateId, "#ffffff"));
  const form = {
    ...halloweenFixture, id: "template-proof-campaign", merchantId: merchant.id,
    title: "Jeu synthétique", subtitle: "Une surprise\nvous attend", logoText: merchant.companyName,
    gameType: scratch ? "scratch" as const : "wheel" as const,
    accent: { ink: color, paper: "#ffffff", signal: "#b85be5" },
    presentation: {
      ...halloweenFixture.presentation,
      background: { mode: background === "image" ? "image" as const : "color" as const,
        color: background === "image" ? "#ffffff" : background,
        imageUrl: background === "image" ? "/backgrounds/aurora-retail.svg" : "" },
      logo: { ...halloweenFixture.presentation.logo, textColor: color, marginBottomPx: 20 },
      heading: { ...halloweenFixture.presentation.heading, textColor: color, fontSizePx: 40, fontFamily: "poppins" as const },
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
  if (mode === "public") return <CampaignExperience campaignId={form.id} initialCampaign={publicCampaign} />;
  if (mode === "game-preview") return <CampaignExperience campaignId={form.id} initialCampaign={publicCampaign} isPreview previewToken="fixture-only" />;
  if (mode === "wizard") return <CampaignWizard merchant={merchant} initialCampaign={performance} />;
  if (mode === "editor") return <CampaignEditor merchant={merchant} initialCampaign={performance} deferInlineAssets />;
  return <main style={{ maxWidth: 390, margin: "auto" }}>
    <CampaignLivePreview merchant={merchant} preview={buildCampaignLivePreviewModel(form, merchant)} compact />
  </main>;
}
