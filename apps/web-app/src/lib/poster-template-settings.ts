import { POSTER_FONT_OPTIONS } from "@/lib/poster-fonts";
import {
  getPosterTemplate,
  legacyPosterTemplateMotif,
  POSTER_BACKGROUND_MOTIFS,
  POSTER_TEMPLATES,
} from "@/lib/poster-templates";
import type {
  CampaignPosterSettings,
  PosterBackgroundMotif,
  PosterTemplateId,
  PosterTemplateStyle,
} from "@/lib/types";

function styleOf(poster: CampaignPosterSettings): PosterTemplateStyle {
  const { backgroundMode, backgroundColor, backgroundImageUrl, headlineTextColor,
    headlineFontSizePx, headlineFontFamily, wheel } = poster;
  return { backgroundMode, backgroundColor, backgroundImageUrl, headlineTextColor,
    headlineFontSizePx, headlineFontFamily, wheel: { ...wheel } };
}

// Only the visual settings travel with a template; content and logo stay shared.
export function selectPosterTemplate(poster: CampaignPosterSettings, templateId: PosterTemplateId) {
  if (poster.templateId === templateId) return poster;
  const currentMotif =
    poster.backgroundMotif ?? legacyPosterTemplateMotif(poster.templateId) ?? "plain";
  const template = getPosterTemplate(
    templateId,
    templateId === "classic-wheel" ? poster.backgroundMotif : undefined,
  );
  const templateStyles = {
    ...poster.templateStyles,
    [poster.templateId ?? "classic-wheel"]: styleOf(poster),
  };
  const backgroundMotifStyles = {
    ...poster.backgroundMotifStyles,
    ...(poster.templateId === "classic-wheel" ? { [currentMotif]: styleOf(poster) } : {}),
  };
  // Never seed a customizable template from Élégance's fixed palette/font.
  const source = getPosterTemplate(poster.templateId, poster.backgroundMotif).colorsCustomizable === false
    ? Object.entries(templateStyles).find(([id]) => getPosterTemplate(id as PosterTemplateId).colorsCustomizable !== false)?.[1]
    : styleOf(poster);
  const fixed = template.colorsCustomizable === false;
  const winColor = fixed ? template.wheel.winColor : source?.wheel.winColor ?? template.wheel.winColor;
  const style =
    (templateId === "classic-wheel" ? backgroundMotifStyles[currentMotif] : undefined) ??
    templateStyles[templateId] ?? {
    backgroundMode: "color" as const,
    backgroundColor: template.background,
    backgroundImageUrl: "",
    headlineTextColor: fixed ? template.headlineTextColor : source?.headlineTextColor ?? template.headlineTextColor,
    headlineFontFamily: template.headlineFontFamily ?? source?.headlineFontFamily ?? "geogrotesque",
    headlineFontSizePx: template.headlineFontSizePx,
    wheel: { ...template.wheel, winColor, alternateWinColor: fixed ? template.wheel.alternateWinColor : winColor },
  };
  return { ...poster, ...style, templateId, templateStyles, backgroundMotifStyles };
}

export function selectPosterBackgroundMotif(
  poster: CampaignPosterSettings,
  backgroundMotif: PosterBackgroundMotif,
) {
  const currentMotif =
    poster.backgroundMotif ?? legacyPosterTemplateMotif(poster.templateId) ?? "plain";
  const motifStyles = {
    ...poster.backgroundMotifStyles,
    [currentMotif]: styleOf(poster),
  };
  const motifTemplate = getPosterTemplate("classic-wheel", backgroundMotif);
  const storedStyle = motifStyles[backgroundMotif];
  const style = storedStyle ?? {
    backgroundMode: "color" as const,
    backgroundColor: motifTemplate.background,
    backgroundImageUrl: "",
    headlineTextColor: motifTemplate.headlineTextColor,
    headlineFontFamily: motifTemplate.headlineFontFamily ?? poster.headlineFontFamily,
    headlineFontSizePx: motifTemplate.headlineFontSizePx,
    wheel: { ...motifTemplate.wheel },
  };

  return {
    ...poster,
    ...style,
    templateId: "classic-wheel" as const,
    backgroundMotif,
    backgroundMotifStyles: motifStyles,
  };
}

function normalizeStyle(value: unknown): PosterTemplateStyle | null {
  const style = value as Partial<PosterTemplateStyle> | undefined;
  if (!style || typeof style !== "object") return null;
  const color = (input: unknown): input is string => typeof input === "string" && /^#[\da-f]{6}$/i.test(input);
  const font = style.headlineFontFamily;
  const size = style.headlineFontSizePx;
  const validFont = (input: unknown): input is (typeof POSTER_FONT_OPTIONS)[number] =>
    typeof input === "string" && POSTER_FONT_OPTIONS.includes(input as (typeof POSTER_FONT_OPTIONS)[number]);
  if (!validFont(font) || typeof size !== "number" || !Number.isFinite(size) || !color(style.headlineTextColor) ||
    !color(style.backgroundColor) || !style.wheel ||
    ![style.wheel.winColor, style.wheel.loseColor, style.wheel.rimColor].every(color) ||
    (style.wheel.alternateWinColor !== undefined && !color(style.wheel.alternateWinColor)) ||
    (style.wheel.alternateLoseColor !== undefined && !color(style.wheel.alternateLoseColor))) return null;
  return {
    backgroundMode: "color", backgroundColor: style.backgroundColor, backgroundImageUrl: "",
    headlineTextColor: style.headlineTextColor, headlineFontFamily: font,
    headlineFontSizePx: Math.max(24, Math.min(84, size)),
    wheel: {
      winColor: style.wheel.winColor, alternateWinColor: style.wheel.alternateWinColor,
      loseColor: style.wheel.loseColor, alternateLoseColor: style.wheel.alternateLoseColor,
      rimColor: style.wheel.rimColor,
    },
  };
}

function normalizeStyleMap<T extends string>(value: unknown, keys: readonly T[]) {
  if (!value || typeof value !== "object") return undefined;
  const result: Partial<Record<T, PosterTemplateStyle>> = {};
  for (const key of keys) {
    const style = normalizeStyle((value as Record<string, unknown>)[key]);
    if (style) result[key] = style;
  }
  return result;
}

export function normalizePosterTemplateStyles(value: unknown): CampaignPosterSettings["templateStyles"] {
  return normalizeStyleMap(value, POSTER_TEMPLATES.map((template) => template.id));
}

export function normalizePosterBackgroundMotifStyles(
  value: unknown,
): CampaignPosterSettings["backgroundMotifStyles"] {
  return normalizeStyleMap(value, POSTER_BACKGROUND_MOTIFS.map((motif) => motif.id));
}
