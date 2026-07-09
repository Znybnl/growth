import QRCode from "qrcode";
import { readFileSync } from "node:fs";
import path from "node:path";

import { buildPosterSvg } from "@/lib/poster-render";
import {
  createPosterSettingsDefaults,
  normalizePosterSettings,
} from "@/lib/poster-utils";
import { CampaignPerformance, CampaignPosterSettings, PosterTemplateId } from "@/lib/types";

const POSTER_TEMPLATE_DEFAULTS: Record<
  PosterTemplateId,
  {
    backgroundColor: string;
    headlineTextColor: string;
    headlineFontSizePx: number;
    wheel: CampaignPosterSettings["wheel"];
  }
> = {
  "classic-wheel": {
    backgroundColor: "#fff6ee",
    headlineTextColor: "#050644",
    headlineFontSizePx: 50,
    wheel: {
      winColor: "#5438c8",
      alternateWinColor: "#fff7ef",
      loseColor: "#fff7ef",
      alternateLoseColor: "#fff7ef",
      rimColor: "#3c3c3c",
    },
  },
  "soft-gradient-wheel": {
    backgroundColor: "#f4f3ff",
    headlineTextColor: "#050644",
    headlineFontSizePx: 40,
    wheel: {
      winColor: "#4b35c9",
      alternateWinColor: "#fff7ef",
      loseColor: "#fff7ef",
      alternateLoseColor: "#fff7ef",
      rimColor: "#403c70",
    },
  },
  "terracotta-wheel": {
    backgroundColor: "#ddc9b8",
    headlineTextColor: "#a82c1d",
    headlineFontSizePx: 50,
    wheel: {
      winColor: "#a83222",
      alternateWinColor: "#f8e4d8",
      loseColor: "#f8e4d8",
      alternateLoseColor: "#f8e4d8",
      rimColor: "#2b1d18",
    },
  },
};

let antonFontDataUri: string | null = null;

function getAntonFontDataUri() {
  if (antonFontDataUri) {
    return antonFontDataUri;
  }

  const fontPath = path.join(process.cwd(), "public", "fonts", "anton-regular.ttf");
  const fontBuffer = readFileSync(fontPath);
  antonFontDataUri = `data:font/truetype;base64,${fontBuffer.toString("base64")}`;

  return antonFontDataUri;
}

function applyPosterTemplateDefaults(
  poster: CampaignPosterSettings,
  campaignWheel: CampaignPosterSettings["wheel"],
  options: { preserveWinColor?: boolean; preserveHeadlineTextColor?: boolean } = {},
) {
  const templateId = poster.templateId ?? "classic-wheel";
  const template = POSTER_TEMPLATE_DEFAULTS[templateId] ?? POSTER_TEMPLATE_DEFAULTS["classic-wheel"];
  const hasCustomWinColor = poster.wheel.winColor && poster.wheel.winColor !== campaignWheel.winColor;
  const winColor =
    options.preserveWinColor || hasCustomWinColor
      ? poster.wheel.winColor
      : template.wheel.winColor;
  const headlineTextColor = options.preserveHeadlineTextColor
    ? poster.headlineTextColor
    : template.headlineTextColor;

  return {
    ...poster,
    templateId,
    backgroundMode: "color" as const,
    backgroundColor: template.backgroundColor,
    backgroundImageUrl: "",
    headlineTextColor,
    headlineFontSizePx: template.headlineFontSizePx,
    wheel: {
      ...poster.wheel,
      ...template.wheel,
      winColor,
      alternateWinColor: winColor,
    },
  };
}

export async function createCampaignQrSvg(url: string) {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
    width: 1200,
  });
}

export async function createCampaignPosterSvg(
  performance: CampaignPerformance,
  publicUrl: string,
) {
  const { campaign } = performance;
  const hasExplicitPosterTemplate = Boolean(campaign.presentation.poster?.templateId);
  const normalizedPoster = normalizePosterSettings(
    campaign.presentation.poster,
    createPosterSettingsDefaults({
      templateId: "classic-wheel",
      logoMode: campaign.logoMode ?? "text",
      logoText: campaign.logoText ?? "",
      logoUrl: campaign.logoUrl,
      logoSizePercent: campaign.presentation.logo.sizePercent,
      logoBottomMarginPx: campaign.presentation.logo.marginBottomPx,
      backgroundMode: "color",
      backgroundColor: "#fff6ee",
      backgroundImageUrl: "",
      headline: campaign.subtitle,
      headlineTextColor: "#050644",
      headlineFontSizePx: 50,
      headlineFontFamily: "display",
      wheel: POSTER_TEMPLATE_DEFAULTS["classic-wheel"].wheel,
      footerBackgroundColor: campaign.accent.signal,
    }),
  );
  const poster = hasExplicitPosterTemplate
    ? applyPosterTemplateDefaults(normalizedPoster, campaign.presentation.wheel, {
        preserveWinColor: true,
        preserveHeadlineTextColor: true,
      })
    : applyPosterTemplateDefaults(
        {
          ...normalizedPoster,
          templateId: "classic-wheel" as const,
          headlineFontFamily: "display" as const,
        },
        campaign.presentation.wheel,
      );

  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    margin: 1,
    width: 720,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });
  return buildPosterSvg({
    campaign,
    poster,
    prizes: performance.prizes,
    qrDataUrl,
    displayFontSource: getAntonFontDataUri(),
  });
}
