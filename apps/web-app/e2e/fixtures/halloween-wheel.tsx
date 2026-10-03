"use client";

import { useState } from "react";
import {
  CampaignLivePreview,
  buildCampaignLivePreviewModel,
} from "@/components/merchant/campaign-live-preview";
import { WheelTemplateThumbnail } from "@/components/merchant/wheel-template-thumbnail";
import { CampaignExperience } from "@/components/public/campaign-experience";
import { HalloweenWheelScene } from "@/components/public/halloween-wheel-art";
import { WheelOfFortune } from "@/components/public/wheel-of-fortune";
import { parseCampaignSetupInput } from "@/lib/merchant-input";
import { buildWheelVisualSegments } from "@/lib/wheel-segments";
import type {
  Merchant,
  PublicCampaign,
  GamePageTemplateId,
  LogoMode,
} from "@/lib/types";

export const halloweenFixture = parseCampaignSetupInput(
  {
    id: "fixture-halloween",
    title: "Campagne fictive Halloween",
    subtitle: "TOURNEZ\nLA ROUE",
    gameType: "wheel",
    isActive: false,
    logoMode: "text",
    logoText: "INSTITUT BELLE PEAU",
    emailCaptureEnabled: false,
    accent: {},
    rewardRules: {},
    prizes: [
      {
        id: "reward-ten",
        label: "-10% PROCHAINE VISITE",
        probability: 50,
        totalQuantity: null,
        remainingQuantity: null,
      },
    ],
    presentation: {
      button: {},
      wheel: {},
      poster: { wheel: {} },
      email: {},
      logo: {
        sizePercent: 100,
        marginBottomPx: 5,
        textColor: "#ffffff",
        align: "center",
      },
      heading: {
        fontFamily: "bodoni",
        fontSizePx: 40,
        fontWeight: 500,
        textColor: "#ff00ff",
        align: "center",
      },
      background: {
        mode: "image",
        color: "#ff00ff",
        imageUrl: "https://example.invalid/background.webp",
      },
      layout: {
        templateId: "halloween-gold",
        blockSpacingPx: 32,
        wheelSubtitle: "",
        subtitleSpacingPx: 15,
      },
    },
  },
  "fixture-merchant",
);

export const halloweenPublicFixture: PublicCampaign = {
  ...halloweenFixture,
  id: "fixture-halloween",
  merchantName: "Établissement fictif",
  merchantLogoText: "INSTITUT BELLE PEAU",
  prizes: halloweenFixture.prizes.map((prize) => ({
    ...prize,
    id: prize.id!,
    remainingQuantity: prize.remainingQuantity ?? null,
    purchaseRequired: prize.purchaseRequired ?? false,
  })),
};

export function HalloweenFixture({
  mode = "preview",
  templateId = "halloween-gold",
}: {
  mode?: string;
  templateId?: GamePageTemplateId;
}) {
  const [title, setTitle] = useState(halloweenFixture.subtitle);
  const [size, setSize] = useState(40);
  const [finished, setFinished] = useState(0);
  const [automatic, setAutomatic] = useState<string | null>(null);
  const [logoMode, setLogoMode] = useState<LogoMode>("text");
  const [subtitle, setSubtitle] = useState("");
  const [gap, setGap] = useState(32);
  const form = {
    ...halloweenFixture,
    subtitle: title,
    logoMode,
    logoUrl: logoMode === "image" ? "/icon.svg" : undefined,
    presentation: {
      ...halloweenFixture.presentation,
      heading: { ...halloweenFixture.presentation.heading, fontSizePx: size },
      layout: {
        ...halloweenFixture.presentation.layout,
        templateId,
        wheelSubtitle: subtitle,
        blockSpacingPx: gap,
      },
    },
  };
  const merchant = {
    id: "fixture-merchant",
    companyName: "INSTITUT BELLE PEAU",
    logoText: "INSTITUT BELLE PEAU",
  } as Merchant;
  if (mode === "public")
    return (
      <CampaignExperience
        campaignId={halloweenPublicFixture.id}
        initialCampaign={halloweenPublicFixture}
        isPreview
        previewToken="fixture-only-token"
      />
    );
  if (mode === "thumbnail")
    return (
      <div style={{ width: 220, margin: "auto" }}>
        <WheelTemplateThumbnail templateId="halloween-gold" />
      </div>
    );
  return (
    <main style={{ maxWidth: 390, margin: "auto", background: "#050403" }}>
      {mode === "spin" ? (
        <HalloweenWheelScene
          logoMode="text"
          logoText={form.logoText!}
          title={title}
          titleFontSizePx={size}
        >
          <WheelOfFortune
            pageTemplate="halloween-gold"
            accent={form.accent}
            segments={buildWheelVisualSegments(
              form.prizes.map((prize) => ({ ...prize, id: prize.id! })),
            )}
            winningSegmentId="reward-ten"
            canSpin
            buttonEnabled
            autoSpinKey={automatic}
            onSpinEnd={() => setFinished((count) => count + 1)}
          />
        </HalloweenWheelScene>
      ) : (
        <CampaignLivePreview
          merchant={merchant}
          preview={buildCampaignLivePreviewModel(form, merchant)}
          compact
        />
      )}
      <div style={{ background: "white", color: "black", padding: 16 }}>
        <label>
          Titre de test
          <textarea
            aria-label="Titre de test"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Taille de test
          <input
            aria-label="Taille de test"
            type="number"
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
          />
        </label>
        <label>
          Sous-titre de test
          <input
            aria-label="Sous-titre de test"
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
          />
        </label>
        <label>
          Espacement de test
          <input
            aria-label="Espacement de test"
            type="number"
            value={gap}
            onChange={(event) => setGap(Number(event.target.value))}
          />
        </label>
        <button type="button" onClick={() => setLogoMode("image")}>
          Tester le logo image
        </button>
        <button type="button" onClick={() => setLogoMode("none")}>
          Tester sans logo
        </button>
        <button type="button" onClick={() => setAutomatic("fixture-auto")}>
          Déclencher l’animation automatiquement
        </button>
        <output data-testid="spin-finished">{finished}</output>
      </div>
    </main>
  );
}
