import type { CampaignWheelSettings, GamePageTemplateId } from "@/lib/types";

/** Seasonal styles are available to every sector, independently of Beauty. */
export const CHRISTMAS_WHEEL_THEMES = [
  { id: "christmas-rose", name: "Noël rose poudré", description: "Sapin givré, boules roses et douceur nacrée", primary: "#d48c9a", secondary: "#fff4ec", third: "#f2c7cd", background: "#fff1ef", text: "#882b3f", logo: "#793143", button: "#a75165", rim: "#bd8a49" },
  { id: "christmas-natural", name: "Noël naturel", description: "Sapin, eucalyptus, papier kraft et dorures", primary: "#304d38", secondary: "#fff7e8", third: "#c2a375", background: "#f7ebd6", text: "#294531", logo: "#304735", button: "#496342", rim: "#b28a45" },
  { id: "christmas-traditional", name: "Noël traditionnel", description: "Rouge profond, vert sapin et lumières dorées", primary: "#a90f23", secondary: "#fff1d7", third: "#213d2d", background: "#680510", text: "#f4d68e", logo: "#fff1d7", button: "#8d1524", rim: "#c69b48" },
] as const;

export type ChristmasWheelTemplateId = typeof CHRISTMAS_WHEEL_THEMES[number]["id"];

export function christmasWheelTheme(templateId?: GamePageTemplateId) {
  return CHRISTMAS_WHEEL_THEMES.find(theme => theme.id === templateId);
}

export function isChristmasWheelTemplate(templateId?: GamePageTemplateId): templateId is ChristmasWheelTemplateId {
  return Boolean(christmasWheelTheme(templateId));
}

export function christmasWheelArtwork(templateId: ChristmasWheelTemplateId) {
  return `/images/wheel-templates/${templateId}.webp`;
}

/** Resolve native artwork without persisting it as a shared merchant image. */
export function christmasWheelDefaultBackground(templateId: ChristmasWheelTemplateId, background: { color: string; imageUrl?: string }) {
  if (background.imageUrl) return null;
  return background.color.toLowerCase() === christmasWheelTheme(templateId)!.background
    ? christmasWheelArtwork(templateId) : null;
}

export function christmasWheelPalette(templateId: ChristmasWheelTemplateId, current: CampaignWheelSettings): CampaignWheelSettings {
  const theme = christmasWheelTheme(templateId)!;
  return { ...current, loseColor: theme.primary, alternateLoseColor: theme.secondary, winColor: theme.third, alternateWinColor: theme.secondary, rimColor: theme.rim };
}

/** Sector colors are decorative; they never encode or determine the draw odds. */
export function christmasWheelSegmentColors(templateId: ChristmasWheelTemplateId, count: number, palette: Pick<CampaignWheelSettings, "loseColor" | "alternateLoseColor" | "winColor">) {
  const colors = templateId === "christmas-rose"
    ? [palette.alternateLoseColor, palette.loseColor, palette.alternateLoseColor, palette.winColor]
    : [palette.alternateLoseColor, palette.loseColor, palette.winColor];
  const result = Array.from({ length: count }, (_, index) => colors[index % colors.length]);
  // Close odd/non-multiple sector counts without two equal neighboring fills.
  if (result.length > 1 && result.at(-1) === result[0]) {
    const closingColor = colors.find(color => color !== result[0] && color !== result.at(-2));
    if (closingColor) result[result.length - 1] = closingColor;
  }
  return result;
}
