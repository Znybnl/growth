"use client";

import { useState, useSyncExternalStore } from "react";
import { CampaignLivePreview, buildCampaignLivePreviewModel } from "@/components/merchant/campaign-live-preview";
import { WizardPhoneFrame } from "@/components/merchant/campaign-wizard";
import { FittedWizardPhone } from "@/components/merchant/wizard-responsive-layout";
import { CampaignExperience } from "@/components/public/campaign-experience";
import { WheelOfFortune } from "@/components/public/wheel-of-fortune";
import { CHRISTMAS_WHEEL_THEMES, christmasWheelTheme, christmasWheelPalette, type ChristmasWheelTemplateId } from "@/lib/christmas-wheel-themes";
import type { LogoMode, Merchant, PublicCampaign } from "@/lib/types";
import { halloweenFixture } from "./halloween-wheel";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ChristmasWheelsFixture({ templateId, mode, initialBackground = "native", longCopy = false }: { templateId: ChristmasWheelTemplateId; mode?: string; initialBackground?: string; longCopy?: boolean }) {
  const ready = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [selected, setSelected] = useState(templateId);
  const [background, setBackground] = useState(initialBackground);
  const [logo, setLogo] = useState<LogoMode>("text");
  const [heading, setHeading] = useState("JOUEZ &\nGAGNEZ");
  const [brand, setBrand] = useState("Maison Douceur");
  const [titleColor, setTitleColor] = useState<string>();
  const [clicks, setClicks] = useState(0);
  const [finished, setFinished] = useState(0);
  const theme = christmasWheelTheme(selected)!;
  const form = {
    ...halloweenFixture, id: "fixture-christmas", title: "Noël fictif", subtitle: heading,
    logoMode: logo, logoText: brand, logoUrl: logo === "image" ? "/icon.svg" : undefined,
    prizes: ["-10% PRESTATION", "SOIN OFFERT", "SURPRISE", "BONUS"].map((label, index) => ({ ...halloweenFixture.prizes[0], id: `christmas-prize-${index}`, label, probability: 15 })),
    presentation: { ...halloweenFixture.presentation,
      background: { mode: background === "image" ? "image" as const : "color" as const, color: background === "color" ? "#e0f2fe" : theme.background,
        imageUrl: background === "image" ? "/images/wheel-templates/christmas-natural.webp" : undefined },
      heading: { ...halloweenFixture.presentation.heading, fontFamily: "bodoni" as const, textColor: titleColor ?? theme.text, fontSizePx: 40, align: "center" as const },
      logo: { ...halloweenFixture.presentation.logo, sizePercent: 80, textColor: theme.logo, align: "center" as const },
      button: { ...halloweenFixture.presentation.button, backgroundColor: theme.button, textColor: "#fff8e8" },
      wheel: christmasWheelPalette(selected, halloweenFixture.presentation.wheel),
      layout: { ...halloweenFixture.presentation.layout, templateId: selected, wheelSubtitle: longCopy ? "Tentez de gagner une séance de drainage offerte et bien d’autres surprises beauté pour votre prochaine visite." : selected === "christmas-natural" ? "Des cadeaux de Noël naturels et bien-être !" : selected === "christmas-traditional" ? "Un Noël plein de surprises !" : "Des attentions de Noël rien que pour vous !" },
    },
  };
  const merchant = { id: "fixture-merchant", companyName: brand, logoText: brand } as Merchant;
  const preview = buildCampaignLivePreviewModel(form, merchant);
  const publicCampaign: PublicCampaign = { ...form, merchantName: brand, merchantLogoText: brand,
    prizes: form.prizes.map(prize => ({ ...prize, id: prize.id!, remainingQuantity: null, purchaseRequired: false })) };
  if (mode === "public" || mode === "preview") return <div data-fixture-ready={ready}><CampaignExperience campaignId={form.id} initialCampaign={publicCampaign} isPreview={mode === "preview"} previewToken={mode === "preview" ? "fixture-only" : undefined} /></div>;
  if (mode === "interaction") return <main data-fixture-ready={ready} style={{ maxWidth: 390, margin: "auto" }}>
    <WheelOfFortune pageTemplate={selected} accent={form.accent} wheelStyle={form.presentation.wheel} buttonStyle={form.presentation.button}
      segments={preview.previewSegments} winningSegmentId={preview.winningSegmentId} buttonEnabled canSpin={clicks > 0}
      onButtonClick={() => setClicks(count => count + 1)} onSpinEnd={() => setFinished(count => count + 1)} />
    <p data-testid="action-count">{clicks}</p><p data-testid="result-count">{finished}</p>
  </main>;
  return <main data-fixture-ready={ready} style={{ maxWidth: 390, margin: "auto" }}>
    <FittedWizardPhone><WizardPhoneFrame><CampaignLivePreview merchant={merchant} preview={preview} compact flushTop /></WizardPhoneFrame></FittedWizardPhone>
    <div style={{ padding: 16, color: "black", background: "white" }}>
      <label>Modèle de test<select value={selected} onChange={event => setSelected(event.target.value as ChristmasWheelTemplateId)}>{CHRISTMAS_WHEEL_THEMES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Titre de test<textarea value={heading} onChange={event => setHeading(event.target.value)} /></label>
      <label>Nom de test<input value={brand} onChange={event => setBrand(event.target.value)} /></label>
      <label>Couleur du titre<input type="color" value={titleColor ?? theme.text} onChange={event => setTitleColor(event.target.value)} /></label>
      <label>Fond de test<select value={background} onChange={event => setBackground(event.target.value)}>{["native", "image", "color"].map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Logo de test<select value={logo} onChange={event => setLogo(event.target.value as LogoMode)}>{["text", "image", "none"].map(item => <option key={item}>{item}</option>)}</select></label>
    </div>
  </main>;
}
