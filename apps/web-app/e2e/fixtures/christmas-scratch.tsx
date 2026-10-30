"use client";
import { useState, useSyncExternalStore } from "react";
import { CampaignLivePreview, buildCampaignLivePreviewModel } from "@/components/merchant/campaign-live-preview";
import { CampaignExperience } from "@/components/public/campaign-experience";
import { ImmersiveScratchTicket } from "@/components/public/immersive-scratch-ticket";
import { WizardPhoneFrame } from "@/components/merchant/campaign-wizard";
import { FittedWizardPhone } from "@/components/merchant/wizard-responsive-layout";
import { DraftPreviewViewport } from "@/components/merchant/draft-preview-viewport";
import { CHRISTMAS_SCRATCH_TEMPLATES, christmasScratchTemplate, type ChristmasScratchTemplateId } from "@/lib/christmas-scratch-templates";
import { HALLOWEEN_SCRATCH_TEMPLATE, halloweenScratchTemplate } from "@/lib/halloween-scratch-template";
import { DEFAULT_SCRATCH_HEADING_FONT_SIZE_PX } from "@/lib/campaign-defaults";
import type { LogoMode, Merchant, PublicCampaign } from "@/lib/types";
import { halloweenFixture } from "./halloween-wheel";

const subscribe = () => () => {};
export function ChristmasScratchFixture({ templateId, mode, initialBackground = "native" }: { templateId: ChristmasScratchTemplateId | "scratch-halloween-gold"; mode?: string; initialBackground?: string }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [selected, setSelected] = useState(templateId), [background, setBackground] = useState(initialBackground);
  const [title, setTitle] = useState("Grattez &\ngagnez"), [logo, setLogo] = useState<LogoMode>("text");
  const [starts, setStarts] = useState(0), [reveals, setReveals] = useState(0);
  const theme = (christmasScratchTemplate(selected) || halloweenScratchTemplate(selected))!;
  const form = { ...halloweenFixture, id: "fixture-christmas-scratch", gameType: "scratch" as const, subtitle: title, logoText: "Maison Douceur",
    logoMode: logo, logoUrl: logo === "image" ? "/icon.svg" : undefined, accent: { signal: theme.scratch.base, ink: theme.text, paper: "#fff9ef" },
    presentation: { ...halloweenFixture.presentation,
      background: { mode: background === "image" ? "image" as const : "color" as const, color: background === "color" ? "#e0f2fe" : theme.backgroundColor, imageUrl: background === "image" ? "/backgrounds/aurora-retail.svg" : undefined },
      heading: { ...halloweenFixture.presentation.heading, fontFamily: theme.font, fontSizePx: DEFAULT_SCRATCH_HEADING_FONT_SIZE_PX, textColor: theme.text },
      logo: { ...halloweenFixture.presentation.logo, textColor: theme.logo, sizePercent: 75, marginBottomPx: 36 },
      layout: { ...halloweenFixture.presentation.layout, templateId: selected, scratchSubtitle: theme.sampleSubline, blockSpacingPx: 32 },
    } };
  const merchant = { id: "fixture-merchant", companyName: "Maison Douceur", logoText: "Maison Douceur" } as Merchant;
  const preview = buildCampaignLivePreviewModel(form, merchant);
  if (mode === "public" || mode === "preview") {
    const campaign: PublicCampaign = { ...form, merchantName: merchant.companyName, merchantLogoText: merchant.logoText, prizes: form.prizes.map(prize => ({ ...prize, id: prize.id!, remainingQuantity: null, purchaseRequired: false })) };
    return <main data-fixture-ready={ready}><CampaignExperience campaignId={campaign.id} initialCampaign={campaign} isPreview={mode === "preview"} previewToken={mode === "preview" ? "fixture-only" : undefined} /></main>;
  }
  if (mode === "interaction") return <main data-fixture-ready={ready} className="mx-auto max-w-[390px] px-4" style={{ backgroundColor: theme.backgroundColor, backgroundImage: `url("${theme.background}")`, backgroundSize: "cover" }}>
    <ImmersiveScratchTicket template={theme.id} accent={form.accent} resultLabel={halloweenScratchTemplate(selected) ? "UNE SURPRISE HALLOWEEN" : "UN CADEAU DE NOËL"} enabled
      onReveal={() => setReveals(count => count + 1)} onScratchStart={() => setStarts(count => count + 1)}
      headline={title} secondaryText={form.presentation.layout.scratchSubtitle} logoMode={logo} logoText="Maison Douceur"
      headingFontSizePx={46} headingFontClass="font-bodoni" headingTextColor={theme.text} logoTextColor={theme.logo} />
    <output data-testid="scratch-starts">{starts}</output><output data-testid="scratch-reveals">{reveals}</output>
  </main>;
  return <main data-fixture-ready={ready} className="mx-auto max-w-[390px]">
    <FittedWizardPhone><WizardPhoneFrame>{mode === "live"
      ? ready && <DraftPreviewViewport><CampaignLivePreview merchant={merchant} preview={preview} mobileViewport flushTop /></DraftPreviewViewport>
      : <CampaignLivePreview merchant={merchant} preview={preview} compact flushTop />}</WizardPhoneFrame></FittedWizardPhone>
    <div className="bg-white p-4 text-black">
      <label>Titre de test<textarea value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label>Modèle de test<select value={selected} onChange={event => setSelected(event.target.value as ChristmasScratchTemplateId | "scratch-halloween-gold")}>{[...CHRISTMAS_SCRATCH_TEMPLATES, HALLOWEEN_SCRATCH_TEMPLATE].map(item => <option key={item.id}>{item.id}</option>)}</select></label>
      <label>Fond de test<select value={background} onChange={event => setBackground(event.target.value)}>{["native", "image", "color"].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Logo de test<select value={logo} onChange={event => setLogo(event.target.value as LogoMode)}>{["text", "image", "none"].map(value => <option key={value}>{value}</option>)}</select></label>
    </div>
  </main>;
}
