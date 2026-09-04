import QRCode from "qrcode";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { buildPosterSvg } from "@/lib/poster-render";
import { getPosterFontAsset } from "@/lib/poster-fonts";
import {
  createPosterSettingsDefaults,
  normalizePosterSettings,
} from "@/lib/poster-utils";
import { getPosterTemplate, POSTER_TEMPLATES } from "@/lib/poster-templates";
import { CampaignPerformance, CampaignPosterSettings } from "@/lib/types";

const posterFontSources = new Map<string, string>();

function isPosterTemplateDefaultWinColor(color: string | undefined) {
  return POSTER_TEMPLATES.some(
    (template) => template.wheel.winColor === color,
  ) || color === "#1b2842" || color === "#f4c14a";
}

function getPosterFontSource(font: CampaignPosterSettings["headlineFontFamily"]) {
  const asset = getPosterFontAsset(font);

  if (!asset) {
    return undefined;
  }

  const cached = posterFontSources.get(asset.fileName);
  if (cached) {
    return cached;
  }

  const fontPath = path.join(process.cwd(), "public", "fonts", "poster", asset.fileName);
  const source = pathToFileURL(fontPath).toString();
  posterFontSources.set(asset.fileName, source);

  return source;
}

function applyPosterTemplateDefaults(
  poster: CampaignPosterSettings,
  campaignWheel: CampaignPosterSettings["wheel"],
  options: { preserveWinColor?: boolean; preserveHeadlineTextColor?: boolean } = {},
) {
  const templateId = poster.templateId ?? "classic-wheel";
  const template = getPosterTemplate(templateId);
  const campaignPrimaryColor = campaignWheel.loseColor;
  const campaignGainColor = campaignWheel.winColor;
  const hasCustomWinColor =
    poster.wheel.winColor &&
    !isPosterTemplateDefaultWinColor(poster.wheel.winColor) &&
    poster.wheel.winColor !== campaignPrimaryColor &&
    poster.wheel.winColor !== campaignGainColor;
  const winColor =
    options.preserveWinColor || hasCustomWinColor
      ? poster.wheel.winColor
      : campaignPrimaryColor;
  const headlineTextColor = options.preserveHeadlineTextColor
    ? poster.headlineTextColor
    : template.headlineTextColor;

  return {
    ...poster,
    templateId,
    backgroundMode: "color" as const,
    backgroundColor: template.background,
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
  const campaignPrimaryColor =
    campaign.gameType === "scratch"
      ? campaign.accent.signal
      : campaign.presentation.wheel.loseColor;
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
      headlineTextColor: "#1b2842",
      headlineFontSizePx: 50,
      headlineFontFamily: "display",
      wheel: {
        ...getPosterTemplate("classic-wheel").wheel,
        winColor: campaignPrimaryColor,
        alternateWinColor: campaignPrimaryColor,
      },
      footerBackgroundColor: campaign.accent.signal,
    }),
  );
  const posterWithNormalizedHeadline =
    normalizedPoster.headlineTextColor === "#f4c14a"
      ? { ...normalizedPoster, headlineTextColor: "#1b2842" }
      : normalizedPoster;
  const poster = hasExplicitPosterTemplate
    ? applyPosterTemplateDefaults(posterWithNormalizedHeadline, {
        ...campaign.presentation.wheel,
        loseColor: campaignPrimaryColor,
      }, {
        preserveHeadlineTextColor: true,
      })
    : applyPosterTemplateDefaults(
        {
          ...posterWithNormalizedHeadline,
          templateId: "classic-wheel" as const,
          headlineTextColor: "#1b2842",
          headlineFontFamily: "display" as const,
        },
        {
          ...campaign.presentation.wheel,
          loseColor: campaignPrimaryColor,
        },
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
    posterFontSource: getPosterFontSource(poster.headlineFontFamily),
  });
}
