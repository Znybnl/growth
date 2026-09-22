import QRCode from "qrcode";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { buildPosterSvg } from "@/lib/poster-render";
import { getPosterFontAsset, getPosterSubtitleFont } from "@/lib/poster-fonts";
import {
  createPosterSettingsDefaults,
  normalizePosterSettings,
  resolvePosterWheelPalette,
  resolvePosterLogoSettings,
} from "@/lib/poster-utils";
import { getPosterTemplate, POSTER_TEMPLATES } from "@/lib/poster-templates";
import { CampaignPerformance, CampaignPosterSettings } from "@/lib/types";

const posterFontSources = new Map<string, string>();
const posterBackdropSources = new Map<string, string>();

function getPosterBackdropSource(
  templateId: CampaignPosterSettings["templateId"],
  backgroundMotif: CampaignPosterSettings["backgroundMotif"],
) {
  const asset = getPosterTemplate(templateId, backgroundMotif).backdropAsset;
  if (!asset) {
    return undefined;
  }

  const cached = posterBackdropSources.get(asset);
  if (cached) {
    return cached;
  }

  const filePath = path.join(process.cwd(), "public", "backgrounds", asset);
  const source = `data:image/png;base64,${readFileSync(filePath).toString("base64")}`;
  posterBackdropSources.set(asset, source);
  return source;
}

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
  const template = getPosterTemplate(templateId, poster.backgroundMotif);
  const campaignPrimaryColor = campaignWheel.loseColor;
  const campaignGainColor = campaignWheel.winColor;
  const isFixedColorTemplate = template.colorsCustomizable === false;
  const hasCustomWinColor =
    poster.wheel.winColor &&
    !isPosterTemplateDefaultWinColor(poster.wheel.winColor) &&
    poster.wheel.winColor !== campaignPrimaryColor &&
    poster.wheel.winColor !== campaignGainColor;
  const winColor = isFixedColorTemplate
    ? template.wheel.winColor
    : options.preserveWinColor || hasCustomWinColor
      ? poster.wheel.winColor
      : campaignPrimaryColor;
  const headlineTextColor = isFixedColorTemplate
    ? template.headlineTextColor
    : options.preserveHeadlineTextColor
      ? poster.headlineTextColor
      : template.headlineTextColor;
  const backgroundColor =
    template.id === "classic-wheel" && poster.backgroundMode === "color"
      ? poster.backgroundColor || template.background
      : template.background;

  return {
    ...poster,
    templateId,
    backgroundMode: "color" as const,
    backgroundColor,
    backgroundImageUrl: "",
    headlineTextColor,
    headlineFontSizePx: template.headlineFontSizePx,
    headlineFontFamily: template.headlineFontFamily ?? poster.headlineFontFamily,
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
  const normalizedPoster = resolvePosterLogoSettings(
    normalizePosterSettings(
      campaign.presentation.poster,
      createPosterSettingsDefaults({
        templateId: "classic-wheel",
        logoMode: campaign.logoMode ?? "text",
        logoText: campaign.logoText ?? "",
        logoUrl: campaign.logoUrl,
        logoSizePercent: campaign.presentation.logo.sizePercent,
        logoBottomMarginPx: campaign.presentation.poster?.logoBottomMarginPx ?? 10,
        backgroundMode: "color",
        backgroundColor: "#fff6ee",
        backgroundImageUrl: "",
        headline: campaign.subtitle,
        headlineTextColor: "#1b2842",
        headlineFontSizePx: 50,
        headlineFontFamily: "geogrotesque",
        wheel: {
          ...getPosterTemplate("classic-wheel").wheel,
          winColor: campaignPrimaryColor,
          alternateWinColor: campaignPrimaryColor,
        },
        footerBackgroundColor: campaign.accent.signal,
      }),
    ),
    {
      logoMode: campaign.logoMode ?? (campaign.logoUrl ? "image" : "text"),
      logoText: campaign.logoText ?? "",
      logoUrl: campaign.logoUrl,
      logoSizePercent: campaign.presentation.logo.sizePercent,
      logoBottomMarginPx: campaign.presentation.poster?.logoBottomMarginPx ?? 10,
    },
  );
  const posterWithNormalizedHeadline =
    normalizedPoster.headlineTextColor === "#f4c14a"
      ? { ...normalizedPoster, headlineTextColor: "#1b2842" }
      : normalizedPoster;
  const posterWithCurrentPalette =
    campaign.gameType === "wheel"
      ? resolvePosterWheelPalette(posterWithNormalizedHeadline, campaignPrimaryColor)
      : posterWithNormalizedHeadline;
  const poster = hasExplicitPosterTemplate
    ? posterWithCurrentPalette
    : applyPosterTemplateDefaults(
        {
          ...posterWithCurrentPalette,
          templateId: "classic-wheel" as const,
          headlineTextColor: "#1b2842",
          headlineFontFamily: "geogrotesque" as const,
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
    posterSubtitleFontSource: getPosterFontSource(
      getPosterSubtitleFont(campaign.presentation.heading.fontFamily),
    ),
    premiumBackdropSource: getPosterBackdropSource(poster.templateId, poster.backgroundMotif),
  });
}
