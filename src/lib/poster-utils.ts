import {
  CampaignPosterSettings,
  CampaignWheelSettings,
  PosterTemplateId,
  Prize,
  TextFont,
} from "@/lib/types";

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
  return upper.length > 18 ? `${upper.slice(0, 17)}...` : upper;
}

export function splitPosterSegmentLines(label: string) {
  const words = formatSegmentLabel(label).split(/\s+/).filter(Boolean);
  const verticalWords = words.slice(0, 3).map((word) => {
    if (word.length <= 9) {
      return word;
    }

    return `${word.slice(0, 8)}…`;
  });

  if (words.length > 3 && verticalWords.length) {
    const lastIndex = verticalWords.length - 1;
    verticalWords[lastIndex] = verticalWords[lastIndex].endsWith("…")
      ? verticalWords[lastIndex]
      : `${verticalWords[lastIndex].slice(0, Math.max(0, verticalWords[lastIndex].length - 1))}…`;
  }

  return verticalWords.length ? verticalWords : ["CADEAU"];
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
  templateId?: PosterTemplateId;
  logoMode?: "none" | "image" | "text";
  logoText?: string;
  logoUrl?: string;
  logoSizePercent?: number;
  logoBottomMarginPx?: number;
  backgroundMode?: "color" | "image";
  backgroundColor?: string;
  backgroundImageUrl?: string;
  headline?: string;
  headlineTextColor?: string;
  headlineFontSizePx?: number;
  headlineFontFamily?: TextFont;
  wheel: CampaignWheelSettings;
  footerBackgroundColor?: string;
}): CampaignPosterSettings {
  return {
    templateId: input.templateId ?? "classic-wheel",
    logoMode: input.logoMode ?? (input.logoUrl ? "image" : input.logoText ? "text" : "none"),
    logoText: input.logoText ?? "",
    logoUrl: input.logoUrl,
    logoSizePercent: input.logoSizePercent ?? 100,
    logoBottomMarginPx: input.logoBottomMarginPx ?? 28,
    backgroundMode: input.backgroundMode ?? (input.backgroundImageUrl ? "image" : "color"),
    backgroundColor: input.backgroundColor ?? "#ffffff",
    backgroundImageUrl: input.backgroundImageUrl ?? "",
    headline: input.headline ?? "",
    headlineTextColor: input.headlineTextColor ?? "#ffffff",
    headlineFontSizePx: input.headlineFontSizePx ?? 42,
    headlineFontFamily: input.headlineFontFamily ?? "display",
    wheel: {
      ...input.wheel,
    },
    footerBackgroundColor: input.footerBackgroundColor ?? "transparent",
  };
}

export function normalizePosterSettings(
  poster: Partial<CampaignPosterSettings> | undefined,
  defaults: CampaignPosterSettings,
): CampaignPosterSettings {
  return {
    ...defaults,
    ...poster,
    templateId: poster?.templateId ?? defaults.templateId ?? "classic-wheel",
    logoBottomMarginPx: clamp(poster?.logoBottomMarginPx ?? defaults.logoBottomMarginPx, 0, 120),
    logoMode: poster?.logoMode ?? defaults.logoMode,
    logoText: poster?.logoText ?? defaults.logoText,
    backgroundMode: poster?.backgroundMode ?? defaults.backgroundMode,
    backgroundColor: poster?.backgroundColor ?? defaults.backgroundColor,
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
  const winningLabels = prizes.map((prize) => formatSegmentLabel(prize.label)).filter(Boolean);

  const resolvedWinningLabels = [
    winningLabels[0] ?? "CADEAU",
    winningLabels[1] ?? winningLabels[0] ?? "BON D'ACHAT",
    winningLabels[2] ?? winningLabels[1] ?? winningLabels[0] ?? "SURPRISE",
  ];

  const segments = [
    { color: wheel.winColor, label: resolvedWinningLabels[0] },
    { color: wheel.loseColor, label: "PERDU !" },
    { color: wheel.winColor, label: resolvedWinningLabels[1] },
    { color: wheel.loseColor, label: "PERDU !" },
    { color: wheel.winColor, label: resolvedWinningLabels[2] },
    { color: wheel.loseColor, label: "PERDU !" },
  ];

  return segments.map((segment) => ({
    ...segment,
    textColor: getPosterReadableTextColor(segment.color),
  }));
}
