"use client";

import { useState, type ComponentProps } from "react";
import { CampaignLivePreview, buildCampaignLivePreviewModel } from "@/components/merchant/campaign-live-preview";
import { BeautyWheelTemplateGallery } from "@/components/merchant/beauty-wheel-template-gallery";
import { WizardPhoneFrame } from "@/components/merchant/campaign-wizard";
import { CampaignExperience } from "@/components/public/campaign-experience";
import { beautyWheelTheme } from "@/lib/beauty-wheel-themes";
import { WheelOfFortune } from "@/components/public/wheel-of-fortune";
import type { GamePageTemplateId, LogoMode, Merchant, PublicCampaign } from "@/lib/types";
import { halloweenFixture } from "./halloween-wheel";

export function BeautyWheelBackgroundFixture({
  mode,
  templateId,
  background = "native",
  logoMode = "text",
}: { mode?: string; templateId: GamePageTemplateId; background?: string; logoMode?: LogoMode }) {
  const [selectedTemplate, setSelectedTemplate] = useState(templateId);
  const [selectedBackground, setSelectedBackground] = useState(background);
  const [selectedLogoMode, setSelectedLogoMode] = useState(logoMode);
  const [clicks, setClicks] = useState(0);
  const [finished, setFinished] = useState(0);
  const theme = beautyWheelTheme(selectedTemplate);
  const form = {
    ...halloweenFixture,
    id: "fixture-wheel-backgrounds",
    subtitle: "Tournez la roue\net tentez de gagner !",
    logoText: "VOTRE ÉTABLISSEMENT",
    logoMode: selectedLogoMode,
    logoUrl: selectedLogoMode === "image" ? "/images/scratch-templates/beauty-nude-elegance.webp" : undefined,
    presentation: {
      ...halloweenFixture.presentation,
      logo: { ...halloweenFixture.presentation.logo, textColor: theme?.text ?? "#111827" },
      button: { ...halloweenFixture.presentation.button, backgroundColor: theme?.primary ?? "#003cb4" },
      heading: { ...halloweenFixture.presentation.heading, textColor: theme?.text ?? "#111827", fontFamily: theme?.font ?? "poppins" as const },
      background: {
        mode: selectedBackground === "image" ? "image" as const : "color" as const,
        color: selectedBackground === "color" ? "#e0f2fe" : theme?.background ?? "#ffffff",
        imageUrl: selectedBackground === "image" ? "/images/scratch-templates/beauty-lilas-soin-doux.webp" : undefined,
      },
      wheel: { ...halloweenFixture.presentation.wheel, rimColor: theme?.secondary ?? "#ffffff", loseColor: theme?.primary ?? "#f3a4c4", alternateLoseColor: theme?.secondary ?? "#fff9fb" },
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
  const preview = buildCampaignLivePreviewModel(form, merchant);
  if (mode === "public") return <CampaignExperience campaignId={publicCampaign.id} initialCampaign={publicCampaign} isPreview previewToken="fixture-only-token" />;
  if (mode === "interaction") return <main style={{ width: 390, height: 500 }}>
    <WheelOfFortune accent={form.accent} wheelStyle={form.presentation.wheel} pageTemplate={selectedTemplate as ComponentProps<typeof WheelOfFortune>["pageTemplate"]}
      segments={preview.previewSegments} winningSegmentId={preview.winningSegmentId} buttonStyle={form.presentation.button}
      buttonEnabled canSpin={clicks > 0} onButtonClick={() => setClicks((count) => count + 1)} onSpinEnd={() => setFinished((count) => count + 1)} />
    <p data-testid="action-count">{clicks}</p><p data-testid="result-count">{finished}</p>
  </main>;
  return <main style={{ maxWidth: mode === "gallery" ? 960 : 390, margin: "auto" }}>
    {mode === "gallery" ? <BeautyWheelTemplateGallery selectedTemplateId={selectedTemplate} onSelect={setSelectedTemplate} /> : (
      <WizardPhoneFrame><CampaignLivePreview merchant={merchant} preview={preview} compact flushTop /></WizardPhoneFrame>
    )}
    <div style={{ padding: 16, background: "white", color: "black" }}>
      <label>Template de test<select value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value as GamePageTemplateId)}>
        {["beauty-nude", "beauty-botanical", "beauty-rose", "beauty-pop", "beauty-editorial", "beauty-tech", "rose-institut", "classic"].map((id) => <option key={id} value={id}>{id}</option>)}
      </select></label>
      <label>Logo de test<select value={selectedLogoMode} onChange={(event) => setSelectedLogoMode(event.target.value as LogoMode)}>
        {["text", "image", "none"].map((value) => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <label>Fond de test<select value={selectedBackground} onChange={(event) => setSelectedBackground(event.target.value)}>
        {["native", "image", "color"].map((value) => <option key={value} value={value}>{value}</option>)}
      </select></label>
    </div>
  </main>;
}
