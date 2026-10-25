"use client";

import { useState, type ComponentProps } from "react";
import { CampaignLivePreview, buildCampaignLivePreviewModel } from "@/components/merchant/campaign-live-preview";
import { BeautyWheelTemplateGallery } from "@/components/merchant/beauty-wheel-template-gallery";
import { WizardPhoneFrame } from "@/components/merchant/campaign-wizard";
import { FittedWizardPhone } from "@/components/merchant/wizard-responsive-layout";
import { CampaignExperience } from "@/components/public/campaign-experience";
import { beautyWheelLogoColor, beautyWheelTheme } from "@/lib/beauty-wheel-themes";
import { wheelPaletteForTemplate } from "@/lib/campaign-defaults";
import { WheelOfFortune } from "@/components/public/wheel-of-fortune";
import type { GamePageTemplateId, LogoMode, Merchant, PublicCampaign } from "@/lib/types";
import { halloweenFixture } from "./halloween-wheel";

export function BeautyWheelBackgroundFixture({
  mode,
  templateId,
  background = "native",
  logoMode = "text",
  prizeCase,
}: { mode?: string; templateId: GamePageTemplateId; background?: string; logoMode?: LogoMode; prizeCase?: string }) {
  const [selectedTemplate, setSelectedTemplate] = useState(templateId);
  const [selectedBackground, setSelectedBackground] = useState(background);
  const [selectedLogoMode, setSelectedLogoMode] = useState(logoMode);
  const [clicks, setClicks] = useState(0);
  const [finished, setFinished] = useState(0);
  const [heading, setHeading] = useState(mode === "marketing" ? "Une surprise\nvous attend" : templateId === "beauty-pop" ? "Jouez & gagnez" : "Tournez la roue\net tentez de gagner !");
  const [brand, setBrand] = useState(mode === "marketing" ? "Maison Botanique" : templateId === "beauty-pop" ? "L’Institut" : "VOTRE ÉTABLISSEMENT");
  const theme = beautyWheelTheme(selectedTemplate);
  const legacy = selectedTemplate === "beauty-editorial" && selectedBackground === "legacy";
  const form = {
    ...halloweenFixture,
    id: "fixture-wheel-backgrounds",
    subtitle: heading,
    logoText: brand,
    prizes: prizeCase === "headspa" ? [
      { ...halloweenFixture.prizes[0], id: "discount15", label: "-15% PRESTATION", probability: 15 },
      { ...halloweenFixture.prizes[0], id: "discount20", label: "-20% PRESTATION", probability: 10 },
      { ...halloweenFixture.prizes[0], id: "voucher", label: "5€ offert", probability: 10 },
      { ...halloweenFixture.prizes[0], id: "luxo", label: "une séance de luxopuncture", probability: 5, remainingQuantity: 5 },
      { ...halloweenFixture.prizes[0], id: "headspa", label: "un soin headspa INTITION", probability: 5, remainingQuantity: 1 },
    ] : selectedTemplate === "beauty-pop" ? [
      { ...halloweenFixture.prizes[0], id: "pop-gift", label: "CADEAU", probability: 20 },
      { ...halloweenFixture.prizes[0], id: "pop-discount", label: "-10% PROCHAINE VISITE", probability: 20 },
      { ...halloweenFixture.prizes[0], id: "pop-care", label: "SOIN OFFERT", probability: 10 },
      { ...halloweenFixture.prizes[0], id: "pop-surprise", label: "SURPRISE", probability: 10 },
    ] : halloweenFixture.prizes,
    logoMode: selectedLogoMode,
    logoUrl: selectedLogoMode === "image" ? "/images/scratch-templates/beauty-nude-elegance.webp" : undefined,
    presentation: {
      ...halloweenFixture.presentation,
      logo: { ...halloweenFixture.presentation.logo, textColor: legacy ? "#171614" : theme ? beautyWheelLogoColor(theme.id) : "#111827", align: legacy ? "left" as const : "center" as const },
      button: { ...halloweenFixture.presentation.button, backgroundColor: theme?.primary ?? "#003cb4" },
      heading: { ...halloweenFixture.presentation.heading, textColor: legacy ? "#171614" : theme?.text ?? "#111827", fontFamily: theme?.font ?? "poppins" as const, align: legacy ? "left" as const : "center" as const },
      background: {
        mode: selectedBackground === "image" ? "image" as const : "color" as const,
        color: legacy ? "#f4f0e8" : selectedBackground === "color" ? "#e0f2fe" : theme?.background ?? "#ffffff",
        imageUrl: selectedBackground === "image" ? "/images/scratch-templates/beauty-lilas-soin-doux.webp" : undefined,
      },
      wheel: theme ? wheelPaletteForTemplate(theme.id, halloweenFixture.presentation.wheel) : { ...halloweenFixture.presentation.wheel, rimColor: "#ffffff", loseColor: "#f3a4c4", alternateLoseColor: "#fff9fb" },
      layout: { ...halloweenFixture.presentation.layout, templateId: selectedTemplate, wheelSubtitle: selectedTemplate === "beauty-pop" ? "De belles surprises vous attendent lors de votre prochaine visite !" : "Des surprises vous attendent" },
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
  if (mode === "public" || mode === "marketing") return <CampaignExperience campaignId={publicCampaign.id} initialCampaign={publicCampaign} isPreview={mode !== "marketing"} previewToken={mode === "marketing" ? undefined : "fixture-only-token"} />;
  if (mode === "interaction") return <main style={{ width: 390, height: 500 }}>
    <WheelOfFortune accent={form.accent} wheelStyle={form.presentation.wheel} pageTemplate={selectedTemplate as ComponentProps<typeof WheelOfFortune>["pageTemplate"]}
      segments={preview.previewSegments} winningSegmentId={preview.winningSegmentId} buttonStyle={form.presentation.button}
      buttonEnabled canSpin={clicks > 0} onButtonClick={() => setClicks((count) => count + 1)} onSpinEnd={() => setFinished((count) => count + 1)} />
    <p data-testid="action-count">{clicks}</p><p data-testid="result-count">{finished}</p>
  </main>;
  return <main style={{ maxWidth: mode === "gallery" ? 960 : 390, margin: "auto" }}>
    {mode === "gallery" ? <BeautyWheelTemplateGallery selectedTemplateId={selectedTemplate} onSelect={setSelectedTemplate} /> : (
      <FittedWizardPhone><WizardPhoneFrame><CampaignLivePreview merchant={merchant} preview={preview} compact flushTop /></WizardPhoneFrame></FittedWizardPhone>
    )}
    <div style={{ padding: 16, background: "white", color: "black" }}>
      <label>Titre de test<input value={heading} onChange={(event)=>setHeading(event.target.value)} /></label>
      <label>Nom de test<input value={brand} onChange={(event)=>setBrand(event.target.value)} /></label>
      <label>Template de test<select value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value as GamePageTemplateId)}>
        {["beauty-nude", "beauty-botanical", "beauty-rose", "beauty-pop", "beauty-editorial", "beauty-tech", "rose-institut", "classic"].map((id) => <option key={id} value={id}>{id}</option>)}
      </select></label>
      <label>Logo de test<select value={selectedLogoMode} onChange={(event) => setSelectedLogoMode(event.target.value as LogoMode)}>
        {["text", "image", "none"].map((value) => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <label>Fond de test<select value={selectedBackground} onChange={(event) => setSelectedBackground(event.target.value)}>
        {["native", "image", "color", "legacy"].map((value) => <option key={value} value={value}>{value}</option>)}
      </select></label>
    </div>
  </main>;
}
