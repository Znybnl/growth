import {
  CampaignAccent,
  CampaignPosterSettings,
  CampaignWheelSettings,
  GamePageTemplateId,
  Merchant,
} from "@/lib/types";
import { createPosterSettingsDefaults } from "@/lib/poster-utils";

export const DEFAULT_WHEEL_SUBTITLE = "Faites tournez la roue pour jouer !";
export const DEFAULT_SCRATCH_SUBTITLE = "Grattez le ticket pour jouer !";
export const DEFAULT_WHEEL_PRIMARY_COLOR = "#1b2842";
export const DEFAULT_SCRATCH_PRIMARY_COLOR = "#f4c14a";
export const DEFAULT_SCRATCH_CONFETTI_COLOR = "#f4c14a";
export const DEFAULT_SCRATCH_LILAC_COLOR = "#b85be5";
export const DEFAULT_SCRATCH_TICKET_COLOR = "#f7f7f7";
export const DEFAULT_SCRATCH_TEXT_COLOR = "#ffffff";
export const MAX_CAMPAIGN_SUBTITLE_LINES = 3;
export const MAX_CAMPAIGN_SUBTITLE_LENGTH = 120;

/** Fixed-palette templates intentionally ignore the merchant's primary color. */
export function scratchTemplatePrimaryColor(
  configuredColor: string,
  templateId?: GamePageTemplateId,
) {
  if (templateId === "scratch-confetti") return DEFAULT_SCRATCH_CONFETTI_COLOR;
  if (templateId === "scratch-lilac") return DEFAULT_SCRATCH_LILAC_COLOR;
  return configuredColor;
}

/** Keep the player-facing promise readable in the phone-sized game surface. */
export function limitCampaignSubtitleLines(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .slice(0, MAX_CAMPAIGN_SUBTITLE_LINES)
    .join("\n")
    .slice(0, MAX_CAMPAIGN_SUBTITLE_LENGTH);
}

/** Normalise the editor's logo scale so legacy values cannot break the preview. */
export function clampCampaignLogoSizePercent(value: number | undefined) {
  const normalized = Number(value);
  return Math.max(0, Math.min(200, Number.isFinite(normalized) ? normalized : 100));
}

/** Text logos use the same percentage scale as uploaded logos. */
export function campaignLogoTextSizePx(
  sizePercent: number | undefined,
  _gameType: "wheel" | "scratch",
) {
  void _gameType;
  // The public game and the wizard preview use one visual scale for text logos.
  // Keeping this base size independent from the game type prevents the scratch
  // ticket logo from appearing larger than the wheel at the same percentage.
  const baseSize = 24;
  return Math.round(
    Math.max(12, (baseSize * clampCampaignLogoSizePercent(sizePercent)) / 100),
  );
}

const SCRATCH_DEFAULT_INK_VALUES = new Set([
  "",
  "#111827",
  "#ffffff",
  "#f8fbff",
  "#172033",
  "#4c1d95",
  "#3b2500",
]);

export function defaultScratchTextColor(templateId?: GamePageTemplateId) {
  switch (templateId) {
    case "scratch-vault":
    case "scratch-confetti":
      return "#f8fbff";
    case "scratch-lilac":
      return "#4c1d95";
    case "scratch-sunburst":
      return "#3b2500";
    case "scratch-coral":
      return "#172033";
    default:
      return DEFAULT_SCRATCH_TEXT_COLOR;
  }
}

export function normalizeScratchAccent(
  accent: CampaignAccent,
  templateId?: GamePageTemplateId,
): CampaignAccent {
  const normalizedInk = (accent.ink ?? "").trim().toLowerCase();
  return {
    ...accent,
    paper:
      accent.paper === "#eef2ff" || accent.paper === "#939393" || accent.paper === ""
        ? DEFAULT_SCRATCH_TICKET_COLOR
        : accent.paper,
    ink:
      SCRATCH_DEFAULT_INK_VALUES.has(normalizedInk)
        ? defaultScratchTextColor(templateId)
        : accent.ink,
  };
}

/**
 * Resolve the accent used by the player-facing scratch design without
 * mutating the campaign form. Fixed-palette templates must ignore the
 * merchant's configured primary color in both the live preview and the game.
 */
export function resolveScratchAccent(
  accent: CampaignAccent,
  templateId?: GamePageTemplateId,
): CampaignAccent {
  const normalized = normalizeScratchAccent(accent, templateId);
  return {
    ...normalized,
    signal: scratchTemplatePrimaryColor(normalized.signal, templateId),
  };
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** Derive the light companion used by the rim and alternate losing segments. */
export function deriveLighterHex(hex: string, ratio = 0.58) {
  const normalized = hex.replace("#", "");

  if (normalized.length !== 6) {
    return "#c7d2fe";
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return "#c7d2fe";
  }

  const nextRed = clampChannel(red + (255 - red) * ratio);
  const nextGreen = clampChannel(green + (255 - green) * ratio);
  const nextBlue = clampChannel(blue + (255 - blue) * ratio);

  return `#${nextRed.toString(16).padStart(2, "0")}${nextGreen
    .toString(16)
    .padStart(2, "0")}${nextBlue.toString(16).padStart(2, "0")}`;
}

export function createDefaultWheelSettings(
  primaryColor = DEFAULT_WHEEL_PRIMARY_COLOR,
): CampaignWheelSettings {
  return {
    rimColor: deriveLighterHex(primaryColor),
    winColor: "#f4c14a",
    alternateWinColor: "#eef2ff",
    loseColor: primaryColor,
    alternateLoseColor: deriveLighterHex(primaryColor),
  };
}

/**
 * Keep the poster defaults identical between the classic editor and wizard.
 * The poster has its own wheel palette, intentionally darker than the game
 * wheel so the printed visual stays readable.
 */
export function createDefaultPosterSettings(
  merchant: Merchant,
  primaryColor = DEFAULT_WHEEL_PRIMARY_COLOR,
): CampaignPosterSettings {
  return createPosterSettingsDefaults({
    logoMode: "text",
    logoText: merchant.companyName || merchant.logoText,
    backgroundMode: "color",
    backgroundColor: "#ffffff",
    headline: "Scannez, jouez, récupérez votre cadeau !",
    headlineTextColor: DEFAULT_WHEEL_PRIMARY_COLOR,
    headlineFontSizePx: 42,
    headlineFontFamily: "roboto",
    wheel: {
      rimColor: primaryColor,
      winColor: primaryColor,
      alternateWinColor: primaryColor,
      loseColor: primaryColor,
      alternateLoseColor: deriveLighterHex(primaryColor),
    },
    footerBackgroundColor: deriveLighterHex(primaryColor),
  });
}
