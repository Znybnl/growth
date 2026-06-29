import path from "node:path";
import { pathToFileURL } from "node:url";

import QRCode from "qrcode";

import { buildPosterSvg } from "@/lib/poster-render";
import {
  createPosterSettingsDefaults,
  normalizePosterSettings,
} from "@/lib/poster-utils";
import { CampaignPerformance } from "@/lib/types";

let posterFontHref: string | undefined;

function getPosterFontHref() {
  posterFontHref ??= pathToFileURL(path.join(process.cwd(), "public", "fonts", "geist-regular.ttf")).href;
  return posterFontHref;
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
      logoText: campaign.logoText ?? campaign.title,
      logoUrl: campaign.logoUrl,
      logoSizePercent: campaign.presentation.logo.sizePercent,
      logoBottomMarginPx: campaign.presentation.logo.marginBottomPx,
      backgroundMode: "color",
      backgroundColor: "#fff6ee",
      backgroundImageUrl: "",
      headline: campaign.subtitle,
      headlineTextColor: "#050644",
      headlineFontSizePx: campaign.presentation.heading.fontSizePx,
      headlineFontFamily: "display",
      wheel: campaign.presentation.wheel,
      footerBackgroundColor: campaign.accent.signal,
    }),
  );
  const poster = hasExplicitPosterTemplate
    ? normalizedPoster
    : {
        ...normalizedPoster,
        templateId: "classic-wheel" as const,
        backgroundMode: "color" as const,
        backgroundColor: "#fff6ee",
        backgroundImageUrl: "",
        headlineTextColor: "#050644",
        headlineFontFamily: "display" as const,
        wheel: {
          ...normalizedPoster.wheel,
          winColor: "#5438c8",
          loseColor: "#fff7ef",
          alternateWinColor: "#fff7ef",
          alternateLoseColor: "#fff7ef",
          rimColor: "#3c3c3c",
        },
      };

  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    margin: 1,
    width: 720,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });
  const embeddedFontHref = getPosterFontHref();

  return buildPosterSvg({
    campaign,
    poster,
    prizes: performance.prizes,
    qrDataUrl,
    embeddedFontHref,
  });
}
