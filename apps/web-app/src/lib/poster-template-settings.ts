import { POSTER_FONT_OPTIONS } from "@/lib/poster-fonts";
import { getPosterTemplate, POSTER_TEMPLATES } from "@/lib/poster-templates";
import type { CampaignPosterSettings, PosterTemplateId, PosterTemplateStyle } from "@/lib/types";

function styleOf(poster: CampaignPosterSettings): PosterTemplateStyle {
  const { backgroundMode, backgroundColor, backgroundImageUrl, headlineTextColor,
    headlineFontSizePx, headlineFontFamily, wheel } = poster;
  return { backgroundMode, backgroundColor, backgroundImageUrl, headlineTextColor,
    headlineFontSizePx, headlineFontFamily, wheel: { ...wheel } };
}

// Only the visual settings travel with a template; content and logo stay shared.
export function selectPosterTemplate(poster: CampaignPosterSettings, templateId: PosterTemplateId) {
  if (poster.templateId === templateId) return poster;
  const template = getPosterTemplate(templateId);
  const templateStyles = {
    ...poster.templateStyles,
    [poster.templateId ?? "classic-wheel"]: styleOf(poster),
  };
  // Never seed a customizable template from Élégance's fixed palette/font.
  const source = getPosterTemplate(poster.templateId).colorsCustomizable === false
    ? Object.entries(templateStyles).find(([id]) => getPosterTemplate(id as PosterTemplateId).colorsCustomizable !== false)?.[1]
    : styleOf(poster);
  const fixed = template.colorsCustomizable === false;
  const winColor = fixed ? template.wheel.winColor : source?.wheel.winColor ?? template.wheel.winColor;
  const style = templateStyles[templateId] ?? {
    backgroundMode: "color" as const,
    backgroundColor: template.background,
    backgroundImageUrl: "",
    headlineTextColor: fixed ? template.headlineTextColor : source?.headlineTextColor ?? template.headlineTextColor,
    headlineFontFamily: template.headlineFontFamily ?? source?.headlineFontFamily ?? "geogrotesque",
    headlineFontSizePx: template.headlineFontSizePx,
    wheel: { ...template.wheel, winColor, alternateWinColor: fixed ? template.wheel.alternateWinColor : winColor },
  };
  return { ...poster, ...style, templateId, templateStyles };
}

export function normalizePosterTemplateStyles(value: unknown): CampaignPosterSettings["templateStyles"] {
  if (!value || typeof value !== "object") return undefined;
  const result: NonNullable<CampaignPosterSettings["templateStyles"]> = {};
  for (const template of POSTER_TEMPLATES) {
    const style = (value as Record<string, PosterTemplateStyle>)[template.id];
    const color = (input: unknown): input is string => typeof input === "string" && /^#[\da-f]{6}$/i.test(input);
    if (!style || !POSTER_FONT_OPTIONS.includes(style.headlineFontFamily) ||
      !Number.isFinite(style.headlineFontSizePx) || !color(style.headlineTextColor) ||
      !color(style.backgroundColor) || !style.wheel ||
      ![style.wheel.winColor, style.wheel.loseColor, style.wheel.rimColor].every(color) ||
      (style.wheel.alternateWinColor !== undefined && !color(style.wheel.alternateWinColor)) ||
      (style.wheel.alternateLoseColor !== undefined && !color(style.wheel.alternateLoseColor))) continue;
    result[template.id] = {
      backgroundMode: "color", backgroundColor: style.backgroundColor, backgroundImageUrl: "",
      headlineTextColor: style.headlineTextColor, headlineFontFamily: style.headlineFontFamily,
      headlineFontSizePx: Math.max(24, Math.min(84, style.headlineFontSizePx)),
      wheel: {
        winColor: style.wheel.winColor, alternateWinColor: style.wheel.alternateWinColor,
        loseColor: style.wheel.loseColor, alternateLoseColor: style.wheel.alternateLoseColor,
        rimColor: style.wheel.rimColor,
      },
    };
  }
  return result;
}
