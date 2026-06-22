import QRCode from "qrcode";

import { buildPosterSvg } from "@/lib/poster-render";
import {
  createPosterSettingsDefaults,
  normalizePosterSettings,
} from "@/lib/poster-utils";
import { CampaignPerformance } from "@/lib/types";

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
  const poster = normalizePosterSettings(
    campaign.presentation.poster,
    createPosterSettingsDefaults({
      logoMode: campaign.logoMode ?? "text",
      logoText: campaign.logoText ?? campaign.title,
      logoUrl: campaign.logoUrl,
      logoSizePercent: campaign.presentation.logo.sizePercent,
      logoBottomMarginPx: campaign.presentation.logo.marginBottomPx,
      backgroundMode: campaign.presentation.background.mode,
      backgroundColor: campaign.presentation.background.color,
      backgroundImageUrl: campaign.presentation.background.imageUrl ?? "",
      headline: campaign.subtitle,
      headlineTextColor: campaign.presentation.heading.textColor,
      headlineFontSizePx: campaign.presentation.heading.fontSizePx,
      headlineFontFamily: campaign.presentation.heading.fontFamily,
      wheel: campaign.presentation.wheel,
      footerBackgroundColor: campaign.accent.signal,
    }),
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
  });
}
