import {
  CampaignAccent,
  CampaignPosterSettings,
  CampaignWheelSettings,
  GamePageTemplateId,
  Merchant,
  TextFont,
} from "@/lib/types";
import { createPosterSettingsDefaults } from "@/lib/poster-utils";
import { getPosterTemplate } from "@/lib/poster-templates";
import { beautyWheelTheme, isBeautyIndustry } from "@/lib/beauty-wheel-themes";
import { BEAUTY_SCRATCH_TEMPLATES, CLASSIC_NUDE_SCRATCH_TEMPLATE_ID, NUDE_SCRATCH_TEMPLATE_BACKGROUND_URL, beautyScratchTemplate } from "@/lib/beauty-scratch-templates";

export const LEGACY_DEFAULT_WHEEL_SUBTITLE = "Faites tournez la roue pour jouer !";
export const DEFAULT_WHEEL_SUBTITLE = "Tounez la roue et tentez de gagner !";
export const DEFAULT_SCRATCH_SUBTITLE = "Grattez le ticket pour jouer !";
export const DEFAULT_GAME_PAGE_TEMPLATE_ID: GamePageTemplateId = "cocorico-wheel";
export const DEFAULT_WHEEL_PRIMARY_COLOR = "#1b2842";
export const DEFAULT_CLASSIC_WHEEL_PRIMARY_COLOR = "#003cb9";
export const DEFAULT_CLASSIC_POP_PRIMARY_COLOR = "#3c05a0";
export const DEFAULT_COCORICO_PRIMARY_COLOR = "#2563eb";
export const DEFAULT_COCORICO_BACKGROUND_COLOR = "#2563eb";
export const DEFAULT_COCORICO_DUO_BLUE = "#78b4df";
export const DEFAULT_COCORICO_DUO_YELLOW = "#f2c94c";
export const DEFAULT_ROSE_INSTITUT_PRIMARY_COLOR = "#f3a4c4";
export const DEFAULT_ROSE_INSTITUT_SECONDARY_COLOR = "#fff9fb";
export const DEFAULT_ROSE_INSTITUT_TEXT_COLOR = "#003cb4";
export const DEFAULT_ROSE_INSTITUT_BACKGROUND_COLOR = "#fff4f7";
export const DEFAULT_ROSE_INSTITUT_HEADING_SIZE_PX = 40;
export const DEFAULT_WHEEL_HEADING_FONT_SIZE_PX = 40;
export const DEFAULT_ROSE_INSTITUT_HEADING_FONT_FAMILY = "playfair" as const;
export const DEFAULT_SCRATCH_PRIMARY_COLOR = "#f4c14a";
export const DEFAULT_SCRATCH_CONFETTI_COLOR = "#d99a18";
export const DEFAULT_SCRATCH_CORAL_COLOR = "#f47c6b";
export const DEFAULT_SCRATCH_SUNBURST_COLOR = "#e69600";
export const DEFAULT_SCRATCH_LILAC_COLOR = "#b85be5";
export const DEFAULT_SCRATCH_TICKET_COLOR = "#f7f7f7";
export const DEFAULT_SCRATCH_TEXT_COLOR = "#ffffff";
export const DEFAULT_SCRATCH_LILAC_TEXT_COLOR = "#210b32";
export const DEFAULT_SCRATCH_HEADING_FONT_SIZE_PX = 46;
export const MAX_CAMPAIGN_SUBTITLE_LINES = 3;
export const MAX_BEAUTY_WHEEL_TITLE_LINES = 5;
export const MAX_CAMPAIGN_SUBTITLE_LENGTH = 240;
export const CAMPAIGN_SPACING_MIN_PX = 0;
export const CAMPAIGN_SPACING_MAX_PX = 80;
export const DEFAULT_WHEEL_SPACING_PX = 50;
export const DEFAULT_ROSE_POWDER_WHEEL_SPACING_PX = 25;
export const DEFAULT_WHEEL_SUBTITLE_SPACING_PX = 15;
export const MIN_WHEEL_BLOCK_SPACING_PX = 24;

/** Preserve a small structural clearance even when the configurable gap is zero. */
export function campaignWheelBlockSpacingPx(value: number | undefined) {
  return Math.max(MIN_WHEEL_BLOCK_SPACING_PX, clampCampaignSpacingPx(value));
}

export function campaignSubtitleForGameTypeChange(
  currentSubtitle: string,
  gameType: "wheel" | "scratch",
) {
  const normalized = currentSubtitle.trim();
  const isKnownDefault = [
    DEFAULT_WHEEL_SUBTITLE,
    LEGACY_DEFAULT_WHEEL_SUBTITLE,
    DEFAULT_SCRATCH_SUBTITLE,
  ].includes(normalized);

  return isKnownDefault
    ? gameType === "wheel"
      ? DEFAULT_WHEEL_SUBTITLE
      : DEFAULT_SCRATCH_SUBTITLE
    : currentSubtitle;
}

export function normalizeWheelSubtitle(value: string) {
  return value.trim() === LEGACY_DEFAULT_WHEEL_SUBTITLE ? DEFAULT_WHEEL_SUBTITLE : value;
}

export function defaultWheelSubtitleSpacingForTemplate(templateId?: GamePageTemplateId) {
  // Keep the template argument for existing callers; the default is now shared by every wheel.
  void templateId;
  return DEFAULT_WHEEL_SUBTITLE_SPACING_PX;
}

export function defaultWheelBlockSpacingForTemplate(templateId?: GamePageTemplateId) {
  if (templateId === "halloween-gold") return 38;
  return templateId === "beauty-rose"
    ? DEFAULT_ROSE_POWDER_WHEEL_SPACING_PX
    : DEFAULT_WHEEL_SPACING_PX;
}

/** Only used to initialize a new scratch design; saved choices remain unchanged. */
export function defaultScratchTemplateForIndustry(industry?: string | null): GamePageTemplateId {
  return isBeautyIndustry(industry) ? "beauty-scratch-nude" : CLASSIC_NUDE_SCRATCH_TEMPLATE_ID;
}

export function scratchTemplateDefaultPrimaryColor(templateId?: GamePageTemplateId) {
  if (templateId === CLASSIC_NUDE_SCRATCH_TEMPLATE_ID) return "#b99a6a";
  const beautyTemplate = beautyScratchTemplate(templateId);
  if (beautyTemplate) return beautyTemplate.scratch.base;
  switch (templateId) {
    case "scratch-confetti":
      return DEFAULT_SCRATCH_CONFETTI_COLOR;
    case "scratch-coral":
      return DEFAULT_SCRATCH_CORAL_COLOR;
    case "scratch-sunburst":
      return DEFAULT_SCRATCH_SUNBURST_COLOR;
    case "scratch-lilac":
      return DEFAULT_SCRATCH_LILAC_COLOR;
    default:
      return undefined;
  }
}

export function shouldApplyScratchTemplateDefaultPrimaryColor(configuredColor: string) {
  return [
    DEFAULT_SCRATCH_PRIMARY_COLOR,
    DEFAULT_SCRATCH_CONFETTI_COLOR,
    DEFAULT_SCRATCH_CORAL_COLOR,
    DEFAULT_SCRATCH_SUNBURST_COLOR,
    DEFAULT_SCRATCH_LILAC_COLOR,
    "#b99a6a",
    ...BEAUTY_SCRATCH_TEMPLATES.map((template) => template.scratch.base),
  ].includes(configuredColor.trim().toLowerCase());
}

/**
 * Restore the Cocorico wheel palette after leaving a scratch ticket.
 *
 * The wheel settings are kept while the user edits the ticket. Known
 * template defaults are safe to replace, whereas an explicit wheel color
 * must survive the round trip.
 */
export function resolveWheelPrimaryColorAfterGameTypeSwitch(configuredColor: string | undefined) {
  const normalized = configuredColor?.trim().toLowerCase();
  const knownTemplateDefaults = [
    DEFAULT_WHEEL_PRIMARY_COLOR,
    DEFAULT_CLASSIC_WHEEL_PRIMARY_COLOR,
    DEFAULT_CLASSIC_POP_PRIMARY_COLOR,
    DEFAULT_COCORICO_PRIMARY_COLOR,
    DEFAULT_COCORICO_DUO_BLUE,
    DEFAULT_SCRATCH_PRIMARY_COLOR,
    DEFAULT_SCRATCH_CONFETTI_COLOR,
    DEFAULT_SCRATCH_CORAL_COLOR,
    DEFAULT_SCRATCH_SUNBURST_COLOR,
    DEFAULT_SCRATCH_LILAC_COLOR,
    ...BEAUTY_SCRATCH_TEMPLATES.map((template) => template.scratch.base),
  ];

  return !normalized || knownTemplateDefaults.includes(normalized)
    ? DEFAULT_COCORICO_PRIMARY_COLOR
    : configuredColor!;
}

export function isClassicPopWheelTemplate(templateId?: GamePageTemplateId) {
  return templateId === "classic" || templateId === "restaurant-pop";
}

export function isCocoricoWheelTemplate(templateId?: GamePageTemplateId) {
  return templateId === "cocorico-wheel" || templateId === "cocorico-duo-wheel";
}

export function isRoseInstitutWheelTemplate(templateId?: GamePageTemplateId) {
  return templateId === "rose-institut";
}

/**
 * Resolve the first palette used when a wheel template is selected. Once a
 * template has been visited, the editors keep its palette separately so this
 * helper is only used for a template without a remembered palette.
 */
export function wheelPaletteForTemplate(
  templateId: GamePageTemplateId,
  current: CampaignWheelSettings,
) {
  const beautyTheme = beautyWheelTheme(templateId);
  if (beautyTheme) {
    return {
      ...current,
      loseColor: beautyTheme.primary,
      alternateLoseColor: beautyTheme.secondary,
      winColor: beautyTheme.secondary,
      alternateWinColor: beautyTheme.secondary,
      rimColor: beautyTheme.primary,
    };
  }

  if (templateId === "classic") {
    return {
      ...current,
      loseColor: DEFAULT_CLASSIC_WHEEL_PRIMARY_COLOR,
      rimColor: deriveLighterHex(DEFAULT_CLASSIC_WHEEL_PRIMARY_COLOR),
      alternateLoseColor: deriveLighterHex(DEFAULT_CLASSIC_WHEEL_PRIMARY_COLOR, 0.7),
    };
  }

  if (templateId === "restaurant-pop") {
    return {
      ...current,
      loseColor: DEFAULT_CLASSIC_POP_PRIMARY_COLOR,
      winColor: "#faf9f7",
      rimColor: deriveLighterHex(DEFAULT_CLASSIC_POP_PRIMARY_COLOR),
      alternateLoseColor: deriveLighterHex(DEFAULT_CLASSIC_POP_PRIMARY_COLOR),
    };
  }

  if (templateId === "cocorico-duo-wheel") {
    return {
      ...current,
      loseColor: DEFAULT_COCORICO_DUO_BLUE,
      rimColor: DEFAULT_COCORICO_DUO_BLUE,
      alternateLoseColor: DEFAULT_COCORICO_DUO_YELLOW,
    };
  }

  if (templateId === "cocorico-wheel") {
    return {
      ...current,
      loseColor: DEFAULT_COCORICO_PRIMARY_COLOR,
      rimColor: DEFAULT_COCORICO_PRIMARY_COLOR,
      alternateLoseColor: DEFAULT_COCORICO_PRIMARY_COLOR,
    };
  }

  if (templateId === "rose-institut") {
    return {
      ...current,
      loseColor: DEFAULT_ROSE_INSTITUT_PRIMARY_COLOR,
      winColor: DEFAULT_ROSE_INSTITUT_SECONDARY_COLOR,
      rimColor: DEFAULT_ROSE_INSTITUT_SECONDARY_COLOR,
      alternateLoseColor: DEFAULT_ROSE_INSTITUT_SECONDARY_COLOR,
      alternateWinColor: DEFAULT_ROSE_INSTITUT_SECONDARY_COLOR,
    };
  }

  return current;
}

/** Initialize the Bicolore page background from its secondary palette color. */
export function wheelBackgroundForTemplate(
  templateId: GamePageTemplateId,
  currentColor: string,
) {
  // A Beauty theme's default is applied when selected in the editor. On load,
  // this resolver must preserve the merchant's saved background color.
  if (beautyWheelTheme(templateId)) return currentColor;

  const normalized = currentColor.trim().toLowerCase();
  const knownTemplateBackgrounds = [
    "#ffffff",
    "#fff",
    DEFAULT_COCORICO_PRIMARY_COLOR,
    DEFAULT_COCORICO_DUO_YELLOW,
  ];

  if (templateId === "cocorico-duo-wheel" && knownTemplateBackgrounds.includes(normalized)) {
    return DEFAULT_COCORICO_DUO_YELLOW;
  }

  if (isCocoricoWheelTemplate(templateId) && knownTemplateBackgrounds.includes(normalized)) {
    return "#ffffff";
  }

  if (templateId === "rose-institut" && knownTemplateBackgrounds.includes(normalized)) {
    return DEFAULT_ROSE_INSTITUT_BACKGROUND_COLOR;
  }

  return currentColor;
}

/** A first template selection must not inherit the previous template's background. */
export function wheelBackgroundForTemplateSelection(
  templateId: GamePageTemplateId,
  currentColor: string,
) {
  if (templateId === "classic") return "#ffffff";
  if (templateId === "restaurant-pop") return "#fffdfa";
  if (templateId === "rose-institut") return DEFAULT_ROSE_INSTITUT_BACKGROUND_COLOR;
  return wheelBackgroundForTemplate(templateId, currentColor);
}

/** First selection only; remembered per-template text colors always take precedence. */
export function wheelHeadingColorForTemplateSelection(templateId: GamePageTemplateId, currentColor: string) {
  if (templateId === "classic") return "#ffffff";
  if (templateId === "restaurant-pop") return "#1b2842";
  return currentColor;
}

/** Moderne uses a white brand mark by default on its blue game background. */
export function wheelLogoColorForTemplateSelection(templateId: GamePageTemplateId, currentColor: string) {
  return templateId === "cocorico-wheel" || templateId === "halloween-gold" ? "#ffffff" : currentColor;
}

/** Dynamique starts with Poppins unless the merchant already chose a font for it. */
export function wheelHeadingFontForTemplateSelection(templateId: GamePageTemplateId, currentFont: TextFont): TextFont {
  if (templateId === "halloween-gold") return "bodoni";
  return templateId === "classic" ? "poppins" : currentFont;
}

/** Isolate Halloween's compact header preset from the other templates' saved spacing. */
export function wheelLogoGapForTemplateSelection(target: GamePageTemplateId, previous: GamePageTemplateId, current: number, saved?: number) {
  if (typeof saved === "number") return saved;
  if (target === "halloween-gold") return 5;
  return previous === "halloween-gold" ? DEFAULT_WHEEL_SPACING_PX : current;
}

export function roseInstitutWheelBackground(configuredColor: string | undefined) {
  const color = configuredColor?.trim() || DEFAULT_ROSE_INSTITUT_BACKGROUND_COLOR;
  return `radial-gradient(circle at 50% 28%, rgba(255,255,255,0.72) 0 24%, transparent 54%), linear-gradient(180deg, ${color} 0%, ${color} 100%)`;
}

/** Signature: a quiet ivory surface with a halo derived from the wheel color. */
export function restaurantPopBackground(configuredColor: string | undefined, primaryColor = DEFAULT_CLASSIC_POP_PRIMARY_COLOR) {
  const color = configuredColor && /^#[0-9a-f]{3,8}$/i.test(configuredColor.trim())
    ? configuredColor.trim()
    : "#fffdfa";
  const surface = color.toLowerCase() === "#fff2dd" ? "#fffdfa" : color;
  const halo = /^#[0-9a-f]{6}$/i.test(primaryColor) ? `${primaryColor}1c` : "#3c05a01c";

  return `radial-gradient(ellipse 75% 40% at 50% 64%, ${halo} 0%, transparent 75%), linear-gradient(180deg, ${surface} 0%, ${surface} 100%)`;
}

/** Dynamique: saturated rays and a soft spotlight follow the selected primary color. */
export function classicWheelBackground(primaryColor: string) {
  const color = /^#[0-9a-f]{6}$/i.test(primaryColor) ? primaryColor : DEFAULT_CLASSIC_WHEEL_PRIMARY_COLOR;
  const deep = deriveLighterHex(color, 0.16);
  return `radial-gradient(circle at 50% 57%, rgba(89,203,255,.35) 0%, transparent 37%), repeating-conic-gradient(from -8deg at 50% 57%, rgba(255,255,255,.11) 0deg 13deg, transparent 13deg 27deg), linear-gradient(160deg, ${color} 0%, ${deep} 100%)`;
}

/** Resolve the blue used by the Cocorico template without changing legacy data. */
export function resolveCocoricoPrimaryColor(configuredColor: string | undefined) {
  const normalized = configuredColor?.trim().toLowerCase();
  return !normalized || normalized === DEFAULT_WHEEL_PRIMARY_COLOR
    ? DEFAULT_COCORICO_PRIMARY_COLOR
    : configuredColor!;
}

/** Keep the Cocorico blue as the default while allowing an explicit background color. */
export function resolveCocoricoBackgroundColor(configuredColor: string | undefined) {
  const normalized = configuredColor?.trim().toLowerCase();
  return !normalized || normalized === "#fff" || normalized === "#ffffff"
    ? DEFAULT_COCORICO_BACKGROUND_COLOR
    : configuredColor!;
}

/** Resolve the scratch card's primary color, preserving only explicitly fixed palettes. */
export function scratchTemplatePrimaryColor(
  configuredColor: string,
  templateId?: GamePageTemplateId,
) {
  if (templateId === CLASSIC_NUDE_SCRATCH_TEMPLATE_ID) return "#b99a6a";
  const beautyTemplate = beautyScratchTemplate(templateId);
  if (beautyTemplate) return beautyTemplate.scratch.base;
  if (templateId === "scratch-confetti") return DEFAULT_SCRATCH_CONFETTI_COLOR;
  return configuredColor;
}

/** Keep the player-facing promise readable in the phone-sized game surface. */
export function limitCampaignSubtitleLines(value: string, maxLines = MAX_CAMPAIGN_SUBTITLE_LINES) {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .slice(0, Math.max(1, Math.floor(maxLines)))
    .join("\n")
    .slice(0, MAX_CAMPAIGN_SUBTITLE_LENGTH);
}

/** Split the Cocorico headline into balanced display lines. */
export function buildCocoricoPromoLines(value: string) {
  const normalized = limitCampaignSubtitleLines(value).trim();
  if (!normalized) return [];

  return normalized.split("\n").flatMap((line) => {
    const trimmedLine = line.trim();
    const words = trimmedLine.split(/\s+/).filter(Boolean);
    if (words.length < 2 || trimmedLine.length < 14) return [trimmedLine];

    const midpoint = trimmedLine.length / 2;
    let bestSplit = 1;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 1; index < words.length; index += 1) {
      const firstLineLength = words.slice(0, index).join(" ").length;
      const distance = Math.abs(firstLineLength - midpoint);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSplit = index;
      }
    }

    return [
      words.slice(0, bestSplit).join(" "),
      words.slice(bestSplit).join(" "),
    ];
  }).slice(0, MAX_CAMPAIGN_SUBTITLE_LINES);
}

/** Keep the Classic and Pop headline contour visible against both text tones. */
export function resolvePromoStrokeColor(textColor: string | undefined) {
  const normalized = (textColor ?? "").replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return "#ffffff";

  const channels = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];

  return luminance > 0.52 ? "#1b2842" : "#ffffff";
}

/** Normalise the editor's logo scale so legacy values cannot break the preview. */
export function clampCampaignLogoSizePercent(value: number | undefined) {
  const normalized = Number(value);
  return Math.max(0, Math.min(200, Number.isFinite(normalized) ? normalized : 100));
}

/** Keep logo and wheel spacing within the range exposed by the campaign editors. */
export function clampCampaignSpacingPx(value: number | undefined, fallback = 20) {
  const normalized = Number(value);
  const safeValue = Number.isFinite(normalized) ? normalized : fallback;
  return Math.round(
    Math.max(CAMPAIGN_SPACING_MIN_PX, Math.min(CAMPAIGN_SPACING_MAX_PX, safeValue)),
  );
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
  "#1f2937",
  "#111827",
  "#ffffff",
  "#f8fbff",
  "#172033",
  "#4c1d95",
  "#3b2500",
]);

const LEGACY_SCRATCH_LILAC_TEXT_COLORS = new Set(["#4c1d95", "#32104f"]);

export function defaultScratchTextColor(templateId?: GamePageTemplateId) {
  if (templateId === CLASSIC_NUDE_SCRATCH_TEMPLATE_ID) return "#49372c";
  const beautyTemplate = beautyScratchTemplate(templateId);
  if (beautyTemplate) return beautyTemplate.text;
  switch (templateId) {
    case "scratch-vault":
    case "scratch-confetti":
      return "#f8fbff";
    case "scratch-lilac":
      return DEFAULT_SCRATCH_LILAC_TEXT_COLOR;
    case "scratch-sunburst":
      return "#3b2500";
    case "scratch-coral":
      return "#172033";
    default:
      return DEFAULT_SCRATCH_TEXT_COLOR;
  }
}

export function resolveScratchTemplateTextColor(
  color: string,
  templateId?: GamePageTemplateId,
) {
  const normalized = color.trim().toLowerCase();
  if (templateId === "scratch-lilac" &&
      (SCRATCH_DEFAULT_INK_VALUES.has(normalized) || LEGACY_SCRATCH_LILAC_TEXT_COLORS.has(normalized))) {
    return defaultScratchTextColor(templateId);
  }
  return color;
}

/** The initial font used by the legacy scratch-card themes called out in issue #439. */
export function defaultScratchTemplateFont(templateId?: GamePageTemplateId) {
  switch (templateId) {
    case CLASSIC_NUDE_SCRATCH_TEMPLATE_ID:
      return "playfair" as const;
    case "scratch-coral":
    case "scratch-vault":
    case "scratch-lilac":
      return "roboto" as const;
    default:
      return undefined;
  }
}

export function scratchTemplateDefaultBackground(
  templateId: GamePageTemplateId,
  background: { mode: "color" | "image"; imageUrl?: string | null },
): string | undefined {
  if (templateId !== CLASSIC_NUDE_SCRATCH_TEMPLATE_ID) return undefined;
  if (background.mode === "image" && background.imageUrl?.trim()) return undefined;
  return NUDE_SCRATCH_TEMPLATE_BACKGROUND_URL;
}

export function scratchTemplateUsesFixedPrimaryColor(templateId?: GamePageTemplateId) {
  return Boolean(
    templateId === CLASSIC_NUDE_SCRATCH_TEMPLATE_ID ||
      beautyScratchTemplate(templateId) ||
      templateId === "scratch-confetti",
  );
}

/**
 * Indicates whether a scratch-ticket template consumes the configurable
 * ticket-text color from the campaign form. Keep this decision in one place
 * so the editor never exposes a control that has no visual effect.
 */
export function scratchTemplateUsesTicketTextColor(templateId?: GamePageTemplateId) {
  switch (templateId) {
    case "scratch-vault":
    case "scratch-confetti":
    case "scratch-coral":
    case "scratch-lilac":
    case "scratch-sunburst":
      return false;
    default:
      return !beautyScratchTemplate(templateId);
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
      (SCRATCH_DEFAULT_INK_VALUES.has(normalizedInk) ||
        (templateId === "scratch-lilac" && LEGACY_SCRATCH_LILAC_TEXT_COLORS.has(normalizedInk)))
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
  const templateDefault = scratchTemplateDefaultPrimaryColor(templateId);
  return {
    ...normalized,
    signal:
      templateDefault && shouldApplyScratchTemplateDefaultPrimaryColor(normalized.signal)
        ? templateDefault
        : scratchTemplatePrimaryColor(normalized.signal, templateId),
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

/** Refresh Dynamique's legacy light segments without changing a merchant-selected secondary color. */
export function dynamicWheelLightSegmentColor(primaryColor: string, secondaryColor: string) {
  return secondaryColor.toLowerCase() === deriveLighterHex(primaryColor).toLowerCase()
    ? deriveLighterHex(primaryColor, 0.7)
    : secondaryColor;
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
  const classicPosterWheel = getPosterTemplate("classic-wheel").wheel;

  return {
    ...createPosterSettingsDefaults({
      logoMode: "text",
      logoText: merchant.companyName || merchant.logoText,
      backgroundMode: "color",
      backgroundColor: "#ffffff",
      headline: "Scannez, jouez, récupérez votre cadeau !",
      headlineTextColor: DEFAULT_WHEEL_PRIMARY_COLOR,
      headlineFontSizePx: 42,
      headlineFontFamily: "geogrotesque",
      wheel: {
        ...classicPosterWheel,
        winColor: primaryColor,
        alternateWinColor: primaryColor,
      },
      footerBackgroundColor: deriveLighterHex(primaryColor),
    }),
    logoSource: "wizard",
  };
}
