"use client";

import { useState } from "react";
import { CampaignLivePreview, buildCampaignLivePreviewModel } from "@/components/merchant/campaign-live-preview";
import { BeautyWheelTemplateGallery } from "@/components/merchant/beauty-wheel-template-gallery";
import { WizardPhoneFrame } from "@/components/merchant/campaign-wizard";
import { CampaignExperience } from "@/components/public/campaign-experience";
import { beautyWheelTheme } from "@/lib/beauty-wheel-themes";
import type { GamePageTemplateId, Merchant, PublicCampaign } from "@/lib/types";
import { halloweenFixture } from "./halloween-wheel";

export function BeautyWheelBackgroundFixture({
  mode,
  templateId,
  background = "native",
}: { mode?: string; templateId: GamePageTemplateId; background?: string }) {
  const [selectedTemplate, setSelectedTemplate] = useState(templateId);
  const [selectedBackground, setSelectedBackground] = useState(background);
  const theme = beautyWheelTheme(selectedTemplate);
  const form = {
    ...halloweenFixture,
    id: "fixture-wheel-backgrounds",
    subtitle: "Tournez la roue\net tentez de gagner !",
    logoText: "VOTRE ÉTABLISSEMENT",
    presentation: {
      ...halloweenFixture.presentation,
      logo: { ...halloweenFixture.presentation.logo, textColor: theme?.text ?? "#111827" },
      button: { ...halloweenFixture.presentation.button, backgroundColor: theme?.primary ?? "#003cb9" },
      heading: { ...halloweenFixture.presentation.heading, textColor: theme?.text ?? "#111827", fontFamily: theme?.font ?? "poppins" as const },
      background: {
        mode: selectedBackground === "image" ? "image" as const : "color" as const,
        color: selectedBackground === "color" ? "#e0f2fe" : theme?.background ?? "#ffffff",
        imageUrl: selectedBackground === "image" ? "/images/scratch-templates/beauty-lilas-soin-doux.webp" : undefined,
      },
      wheel: { ...halloweenFixture.presentation.wheel, rimColor: theme?.secondary ?? "#ffffff", loseColor: theme?.primary ?? "#003cb9", alternateLoseColor: theme?.secondary ?? "#ffffff" },
      layout: { ...halloweenFixture.presentation.layout, templateId: selectedTemplate, wheelSubtitle: "Des surprises vous attendent" },
    },
  };
  const merchant = { id: "fixture-merchant", companyName: "VOTRE ÉTABLISSEMENT", logoText: "VOTRE ÉTABLISSEMENT" } as Merchant;
  const publicCampaign: PublicCampaign = {
    ...form,
    merchantName: merchant.companyName,
    merchantLogoText: merchant.logoText,
    prizes: form.prizes.map((prize) => ({ ...prize, id: prize.id!, remainingQuantity: prize.remainingQuantity ?? null, purchaseRequired: prize.purchaseRequired ?? false })),
  };
  if (mode === "public") return <CampaignExperience campaignId={publicCampaign.id} initialCampaign={publicCampaign} isPreview previewToken="fixture-only-token" />;
  return <main style={{ maxWidth: mode === "gallery" ? 960 : 390, margin: "auto" }}>
    {mode === "gallery" ? <BeautyWheelTemplateGallery selectedTemplateId={selectedTemplate} onSelect={setSelectedTemplate} /> : (
      <WizardPhoneFrame><CampaignLivePreview merchant={merchant} preview={buildCampaignLivePreviewModel(form, merchant)} compact flushTop /></WizardPhoneFrame>
    )}
    <div style={{ padding: 16, background: "white", color: "black" }}>
      <label>Template de test<select value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value as GamePageTemplateId)}>
        {["beauty-nude", "beauty-botanical", "beauty-rose", "classic"].map((id) => <option key={id} value={id}>{id}</option>)}
      </select></label>
      <label>Fond de test<select value={selectedBackground} onChange={(event) => setSelectedBackground(event.target.value)}>
        {["native", "image", "color"].map((value) => <option key={value} value={value}>{value}</option>)}
      </select></label>
    </div>
  </main>;
}
