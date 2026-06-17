import { CampaignPosterSettings, CampaignWheelSettings, Prize, TextFont } from "@/lib/types";

export type PosterWheelSegment = {
  color: string;
  label: string;
  textColor: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();

  if (normalized.length !== 6) {
    return null;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  if ([red, green, blue].some((value) => Number.isNaN(value))) {
    return null;
  }

  return { red, green, blue };
}

function getRelativeLuminance(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function formatSegmentLabel(label: string) {
  const compact = label.replace(/\s+/g, " ").trim();

  if (!compact) {
    return "CADEAU";
  }

  const upper = compact.toUpperCase();
  return upper.length > 22 ? `${upper.slice(0, 21)}...` : upper;
}

export function getPosterReadableTextColor(backgroundColor: string) {
  const rgb = hexToRgb(backgroundColor);

  if (!rgb) {
    return "#ffffff";
  }

  const luminance =
    0.2126 * getRelativeLuminance(rgb.red) +
    0.7152 * getRelativeLuminance(rgb.green) +
    0.0722 * getRelativeLuminance(rgb.blue);

  return luminance > 0.52 ? "#111827" : "#ffffff";
}

export function createPosterSettingsDefaults(input: {
  logoUrl?: string;
  logoSizePercent?: number;
  logoBottomMarginPx?: number;
  backgroundImageUrl?: string;
  headline?: string;
  headlineTextColor?: string;
  headlineFontSizePx?: number;
  headlineFontFamily?: TextFont;
  wheel: CampaignWheelSettings;
  footerBackgroundColor?: string;
}): CampaignPosterSettings {
  return {
    logoUrl: input.logoUrl,
    logoSizePercent: input.logoSizePercent ?? 100,
    logoBottomMarginPx: input.logoBottomMarginPx ?? 28,
    backgroundImageUrl: input.backgroundImageUrl ?? "",
    headline: input.headline ?? "",
    headlineTextColor: input.headlineTextColor ?? "#ffffff",
    headlineFontSizePx: input.headlineFontSizePx ?? 42,
    headlineFontFamily: input.headlineFontFamily ?? "display",
    wheel: {
      ...input.wheel,
    },
    footerBackgroundColor: input.footerBackgroundColor ?? "#8d9ae8",
  };
}

export function normalizePosterSettings(
  poster: Partial<CampaignPosterSettings> | undefined,
  defaults: CampaignPosterSettings,
): CampaignPosterSettings {
  return {
    ...defaults,
    ...poster,
    logoBottomMarginPx: clamp(poster?.logoBottomMarginPx ?? defaults.logoBottomMarginPx, 0, 120),
    wheel: {
      ...defaults.wheel,
      ...poster?.wheel,
    },
  };
}

export function buildPosterWheelSegments(
  prizes: Array<Pick<Prize, "label">>,
  wheel: CampaignWheelSettings,
): PosterWheelSegment[] {
  const winningLabels = prizes
    .map((prize) => formatSegmentLabel(prize.label))
    .filter(Boolean);

  const resolvedWinningLabels = [
    winningLabels[0] ?? "CADEAU",
    winningLabels[1] ?? winningLabels[0] ?? "BON D'ACHAT",
    winningLabels[2] ?? winningLabels[1] ?? winningLabels[0] ?? "SURPRISE",
  ];

  const segments = [
    { color: wheel.winColor, label: resolvedWinningLabels[0] },
    { color: wheel.loseColor, label: "PERDU !" },
    { color: wheel.alternateWinColor, label: resolvedWinningLabels[1] },
    { color: wheel.alternateLoseColor, label: "PERDU !" },
    { color: wheel.winColor, label: resolvedWinningLabels[2] },
    { color: wheel.loseColor, label: "PERDU !" },
  ];

  return segments.map((segment) => ({
    ...segment,
    textColor: getPosterReadableTextColor(segment.color),
  }));
}
