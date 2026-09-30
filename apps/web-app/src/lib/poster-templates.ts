import {
  CampaignPosterSettings,
  PosterBackgroundMotif,
  PosterTemplateId,
  TextFont,
} from "@/lib/types";

export type PosterTemplateConfig = {
  id: PosterTemplateId;
  label: string;
  description: string;
  background: string;
  accent: string;
  accentDark: string;
  headline: string;
  headlineStroke: string;
  headlineTextColor: string;
  headlineFontSizePx: number;
  qrFrame: string;
  logoVariant: "lined" | "badge";
  wheelX: number;
  wheelY: number;
  wheelRadius: number;
  qrX: number;
  qrY: number;
  qrSize: number;
  ctaX: number;
  ctaY: number;
  ctaWidth: number;
  ctaHeight: number;
  ctaRotation: number;
  headlineY: number;
  headlineSizeMultiplier: number;
  motif?: PosterBackgroundMotif;
  colorsCustomizable?: boolean;
  headlineX?: number;
  headlineMaxWidth?: number;
  subtitleMaxWidth?: number;
  headlineBlockBottom?: number;
  headlineLogoGapPx?: number;
  headlineFontWeight?: number;
  headlineLineHeightMultiplier?: number;
  headlineItalic?: boolean;
  headlineFontFamily?: TextFont;
  logoX?: number;
  logoFontWeight?: number;
  logoLetterSpacing?: number;
  logoFontFamily?: TextFont;
  logoTextAnchor?: "start" | "middle";
  logoImageAnchor?: "start" | "middle";
  logoTextMaxCharactersPerLine?: number;
  headlineTextAnchor?: "start" | "middle";
  headlineStretchToWidth?: boolean;
  supportingTextAnchor?: "start" | "middle";
  subtitleLetterSpacing?: number;
  subtitleUppercase?: boolean;
  subtitleMaxCharactersPerLine?: number;
  logoUnderlineWidth?: number;
  logoUnderlineColor?: string;
  logoUnderlineCentered?: boolean;
  logoUnderlineGapPx?: number;
  logoUnderlineStrokeWidth?: number;
  inlineQrCta?: boolean;
  inlineQrLabelBackground?: string;
  inlineQrLabelTextColor?: string;
  inlineQrLabelWidth?: number;
  inlineQrLabelHeight?: number;
  inlineQrLabelGap?: number;
  qrBorderWidth?: number;
  ctaCornerRadius?: number;
  ctaBorderWidth?: number;
  wheelLabelVariant?: "prize-labels" | "gift-icons";
  wheelPointerVariant?: "standard" | "rounded-triangle";
  subtitleSpacingAdjustmentPx?: number;
  supportingText?: string;
  supportingTextX?: number;
  supportingTextY?: number;
  supportingTextFontFamily?: TextFont;
  supportingTextFontSize?: number;
  supportingTextLineHeight?: number;
  supportingTextColor?: string;
  medallionFill?: string;
  supportingTextLetterSpacing?: number;
  footerVariant?: "premium" | "botanical" | "botanical-editorial";
  backdropAsset?: string;
  /**
   * The template supplies its own decorative composition and must not render
   * a game-specific wheel or scratch ticket over the backdrop.
   */
  backgroundOnly?: boolean;
  wheel: CampaignPosterSettings["wheel"];
};

export const POSTER_LOGO_TEXT_TOP_PX = 24;
export const POSTER_LOGO_IMAGE_TOP_PX = 32;
export const POSTER_LOGO_TEXT_SCALE = 0.17;
export const POSTER_LOGO_TEXT_MIN_SIZE_PX = 18;
export const POSTER_LOGO_TEXT_MAX_SIZE_PX = 51;

export function getPosterLogoTopY(logoMode: CampaignPosterSettings["logoMode"]) {
  return logoMode === "text" ? POSTER_LOGO_TEXT_TOP_PX : POSTER_LOGO_IMAGE_TOP_PX;
}

export function getPosterLogoTextFontSizePx(logoBoxSizePx: number) {
  const scaledSize = Math.max(POSTER_LOGO_TEXT_MIN_SIZE_PX, logoBoxSizePx * POSTER_LOGO_TEXT_SCALE);
  return Math.round(Math.min(POSTER_LOGO_TEXT_MAX_SIZE_PX, scaledSize) * 10) / 10;
}

export const POSTER_BACKGROUND_MOTIFS: Array<{
  id: PosterBackgroundMotif;
  label: string;
  description: string;
  preview: string;
}> = [
  {
    id: "soft-gradient",
    label: "Gradient clair",
    description: "Des halos lavande très doux.",
    preview: "linear-gradient(135deg,#f4f3ff,#ffffff)",
  },
  {
    id: "terracotta",
    label: "Terracotta",
    description: "Une ambiance chaude et chaleureuse.",
    preview: "linear-gradient(135deg,#ddc9b8 0%,#f7eee7 100%)",
  },
  {
    id: "plain",
    label: "Clair uni",
    description: "Une surface lumineuse et intemporelle.",
    preview: "#fff6ee",
  },
];

const LEGACY_POSTER_MOTIFS: Partial<Record<PosterTemplateId, PosterBackgroundMotif>> = {
  "classic-wheel": "plain",
  "soft-gradient-wheel": "soft-gradient",
  "terracotta-wheel": "terracotta",
};

export function legacyPosterTemplateMotif(templateId?: PosterTemplateId) {
  return templateId ? LEGACY_POSTER_MOTIFS[templateId] : undefined;
}

export const POSTER_TEMPLATES: PosterTemplateConfig[] = [
  {
    id: "classic-wheel",
    label: "Classique",
    description: "Une structure claire avec plusieurs motifs de fond.",
    background: "#fff6ee",
    accent: "#1b04b8",
    accentDark: "#050644",
    headline: "#050644",
    headlineStroke: "#ffffff",
    headlineTextColor: "#050644",
    headlineFontSizePx: 50,
    qrFrame: "#1b04b8",
    logoVariant: "lined",
    wheelX: 238,
    wheelY: 800,
    wheelRadius: 312,
    qrX: 408,
    qrY: 512,
    qrSize: 292,
    ctaX: 369,
    ctaY: 838,
    ctaWidth: 370,
    ctaHeight: 86,
    ctaRotation: 0,
    headlineY: 245,
    headlineSizeMultiplier: 1.38,
    logoFontWeight: 600,
    subtitleMaxWidth: 700,
    motif: "plain",
    wheel: {
      winColor: "#5438c8",
      alternateWinColor: "#fff7ef",
      loseColor: "#fff7ef",
      alternateLoseColor: "#fff7ef",
      rimColor: "#3c3c3c",
    },
  },
  {
    id: "soft-gradient-wheel",
    label: "Gradient clair",
    description: "Fond lavande lumineux et composition graphique épurée.",
    background: "#f4f3ff",
    accent: "#2100b8",
    accentDark: "#060642",
    headline: "#050644",
    headlineStroke: "none",
    headlineTextColor: "#050644",
    headlineFontSizePx: 40,
    qrFrame: "#2100b8",
    logoVariant: "badge",
    wheelX: 272,
    wheelY: 716,
    wheelRadius: 247,
    qrX: 408,
    qrY: 512,
    qrSize: 277.4,
    ctaX: 359,
    ctaY: 838,
    ctaWidth: 390,
    ctaHeight: 68,
    ctaRotation: 0,
    headlineY: 208,
    headlineSizeMultiplier: 1.52,
    headlineItalic: false,
    logoFontWeight: 600,
    logoUnderlineWidth: 54,
    logoUnderlineColor: "#403c70",
    logoUnderlineStrokeWidth: 2,
    subtitleSpacingAdjustmentPx: 8,
    qrBorderWidth: 2.5,
    ctaCornerRadius: 30,
    ctaBorderWidth: 3,
    wheelLabelVariant: "gift-icons",
    wheelPointerVariant: "rounded-triangle",
    motif: "soft-gradient",
    wheel: {
      winColor: "#4b35c9",
      alternateWinColor: "#fff7ef",
      loseColor: "#fff7ef",
      alternateLoseColor: "#fff7ef",
      rimColor: "#403c70",
    },
  },
  {
    id: "terracotta-wheel",
    label: "Terracotta",
    description: "Palette chaude pour un rendu plus chaleureux.",
    background: "#ddc9b8",
    accent: "#a82c1d",
    accentDark: "#2b1d18",
    headline: "#a82c1d",
    headlineStroke: "rgba(255,255,255,0.42)",
    headlineTextColor: "#a82c1d",
    headlineFontSizePx: 50,
    qrFrame: "#a82c1d",
    logoVariant: "badge",
    wheelX: 228,
    wheelY: 790,
    wheelRadius: 310,
    qrX: 408,
    qrY: 512,
    qrSize: 292,
    ctaX: 369,
    ctaY: 838,
    ctaWidth: 370,
    ctaHeight: 86,
    ctaRotation: 0,
    headlineY: 258,
    headlineSizeMultiplier: 1.34,
    motif: "terracotta",
    wheel: {
      winColor: "#a83222",
      alternateWinColor: "#f8e4d8",
      loseColor: "#f8e4d8",
      alternateLoseColor: "#f8e4d8",
      rimColor: "#2b1d18",
    },
  },
  {
    id: "premium-wheel",
    label: "Élégance",
    description: "Composition ivoire et dorée, inspirée des instituts premium.",
    background: "#f7f2ec",
    accent: "#a17d57",
    accentDark: "#171412",
    headline: "#111111",
    headlineStroke: "none",
    headlineTextColor: "#111111",
    headlineFontSizePx: 58,
    qrFrame: "#ffffff",
    logoVariant: "badge",
    wheelX: 712,
    wheelY: 860,
    wheelRadius: 350,
    qrX: 80,
    qrY: 504,
    qrSize: 270,
    ctaX: 0,
    ctaY: 0,
    ctaWidth: 0,
    ctaHeight: 0,
    ctaRotation: 0,
    headlineY: 170,
    headlineSizeMultiplier: 1.18,
    colorsCustomizable: false,
    headlineX: 284,
    headlineMaxWidth: 500,
    headlineBlockBottom: 430,
    headlineLogoGapPx: 10,
    headlineFontWeight: 500,
    headlineItalic: false,
    headlineFontFamily: "cormorant",
    logoX: 516,
    logoFontWeight: 500,
    logoLetterSpacing: 5,
    inlineQrCta: true,
    backdropAsset: "premium-poster-backdrop.png",
    footerVariant: "premium",
    backgroundOnly: true,
    wheel: {
      winColor: "#d8c8b8",
      alternateWinColor: "#fbf8f4",
      loseColor: "#d8c8b8",
      alternateLoseColor: "#fbf8f4",
      rimColor: "#a17d57",
    },
  },
  {
    id: "botanical-wheel",
    label: "Botanique",
    description: "Fond botanique lumineux, typographie éditoriale et accents sauge.",
    background: "#f6f3ed",
    accent: "#718578",
    accentDark: "#153a35",
    headline: "#153a35",
    headlineStroke: "none",
    headlineTextColor: "#153a35",
    headlineFontSizePx: 66,
    qrFrame: "#9eafa0",
    logoVariant: "lined",
    wheelX: 0,
    wheelY: 0,
    wheelRadius: 0,
    qrX: 466,
    qrY: 507,
    qrSize: 245,
    ctaX: 424,
    ctaY: 756,
    ctaWidth: 326,
    ctaHeight: 64,
    ctaRotation: 0,
    headlineY: 170,
    headlineSizeMultiplier: 1.18,
    colorsCustomizable: false,
    headlineX: 72,
    headlineMaxWidth: 548,
    headlineLogoGapPx: 30,
    headlineFontWeight: 500,
    headlineItalic: false,
    headlineFontFamily: "cormorant",
    logoX: 72,
    logoFontWeight: 500,
    logoLetterSpacing: 5,
    logoFontFamily: "syncopate",
    logoTextAnchor: "start",
    logoImageAnchor: "start",
    logoUnderlineWidth: 68,
    logoUnderlineColor: "#8d9c8e",
    inlineQrCta: true,
    inlineQrLabelBackground: "#718578",
    inlineQrLabelTextColor: "#ffffff",
    inlineQrLabelWidth: 326,
    inlineQrLabelHeight: 64,
    inlineQrLabelGap: 18,
    // The reference composition intentionally leaves this area open between
    // the headline and the QR block. Keep the layout anchor below so the
    // headline remains stable while the supporting copy stays hidden.
    supportingTextX: 72,
    supportingTextY: 463,
    supportingTextFontFamily: "syncopate",
    supportingTextFontSize: 22,
    supportingTextLineHeight: 34,
    supportingTextColor: "#153a35",
    supportingTextLetterSpacing: 3,
    footerVariant: "botanical",
    backdropAsset: "botanical-poster-backdrop.png",
    backgroundOnly: true,
    wheel: {
      winColor: "#718578",
      alternateWinColor: "#718578",
      loseColor: "#f6f3ed",
      alternateLoseColor: "#f6f3ed",
      rimColor: "#718578",
    },
  },
  {
    id: "botanical-editorial-poster",
    label: "Botanique éditorial",
    description: "Feuillages sauge, typographie éditoriale et composition végétale.",
    background: "#fbf9f1",
    accent: "#77845e",
    accentDark: "#1d2a16",
    headline: "#1d2a16",
    headlineStroke: "none",
    headlineTextColor: "#1d2a16",
    headlineFontSizePx: 84,
    qrFrame: "#77845e",
    logoVariant: "lined",
    wheelX: 0,
    wheelY: 0,
    wheelRadius: 0,
    qrX: 300,
    qrY: 582,
    qrSize: 286,
    ctaX: 0,
    ctaY: 0,
    ctaWidth: 0,
    ctaHeight: 0,
    ctaRotation: 0,
    headlineY: 210,
    headlineSizeMultiplier: 1,
    colorsCustomizable: false,
    headlineX: 443,
    headlineMaxWidth: 470,
    subtitleMaxWidth: 650,
    headlineBlockBottom: 520,
    headlineLogoGapPx: 40,
    headlineFontWeight: 500,
    headlineItalic: false,
    headlineFontFamily: "cormorant",
    headlineTextAnchor: "middle",
    headlineStretchToWidth: true,
    logoX: 443,
    logoFontWeight: 500,
    logoTextMaxCharactersPerLine: 22,
    logoLetterSpacing: 2,
    logoFontFamily: "cormorant",
    logoTextAnchor: "middle",
    logoImageAnchor: "middle",
    logoUnderlineWidth: 80,
    logoUnderlineColor: "#77845e",
    subtitleLetterSpacing: 6,
    subtitleUppercase: true,
    subtitleMaxCharactersPerLine: 18,
    supportingText: "De jolis\ncadeaux\nà gagner !",
    supportingTextX: 137,
    supportingTextY: 650,
    supportingTextFontFamily: "cormorant",
    supportingTextFontSize: 37,
    supportingTextLineHeight: 40,
    supportingTextColor: "#1d2a16",
    supportingTextAnchor: "middle",
    medallionFill: "#D3DCC5",
    footerVariant: "botanical-editorial",
    backdropAsset: "botanical-editorial-poster-backdrop.webp",
    backgroundOnly: true,
    wheel: {
      winColor: "#77845e",
      alternateWinColor: "#77845e",
      loseColor: "#fbf9f1",
      alternateLoseColor: "#fbf9f1",
      rimColor: "#d6bd8c",
    },
  },
  {
    id: "pastel-editorial-wheel",
    label: "Éditorial pastel",
    description: "Fond organique rose-lilas, titrage sérif et QR code mis en scène.",
    background: "linear-gradient(135deg,#ffe2d3 0%,#f6d2e0 48%,#e7d4f5 100%)",
    accent: "#e9a9b9",
    accentDark: "#111111",
    headline: "#111111",
    headlineStroke: "none",
    headlineTextColor: "#111111",
    headlineFontSizePx: 72,
    qrFrame: "#f4b5c3",
    logoVariant: "lined",
    wheelX: 0,
    wheelY: 0,
    wheelRadius: 0,
    qrX: 112,
    qrY: 620,
    qrSize: 310,
    ctaX: 0,
    ctaY: 0,
    ctaWidth: 0,
    ctaHeight: 0,
    ctaRotation: 0,
    headlineY: 188,
    headlineSizeMultiplier: 1.3,
    colorsCustomizable: false,
    headlineX: 76,
    headlineMaxWidth: 560,
    subtitleMaxWidth: 450,
    headlineBlockBottom: 476,
    headlineLogoGapPx: 42,
    headlineFontWeight: 600,
    headlineLineHeightMultiplier: 1.0,
    headlineItalic: false,
    headlineFontFamily: "cormorant",
    logoX: 397,
    logoFontWeight: 500,
    logoLetterSpacing: 0,
    logoFontFamily: "cormorant",
    logoTextAnchor: "middle",
    logoImageAnchor: "middle",
    logoUnderlineWidth: 86,
    logoUnderlineColor: "#111111",
    logoUnderlineCentered: true,
    supportingTextX: 76,
    supportingTextY: 476,
    supportingTextFontFamily: "inter",
    supportingTextFontSize: 28,
    supportingTextLineHeight: 42,
    supportingTextColor: "#111111",
    supportingTextLetterSpacing: 3.2,
    backgroundOnly: true,
    wheel: {
      winColor: "#e9a9b9",
      alternateWinColor: "#fffaf7",
      loseColor: "#fffaf7",
      alternateLoseColor: "#fffaf7",
      rimColor: "#e9a9b9",
    },
  },
  {
    id: "ivory-editorial-wheel",
    label: "Éditorial ivoire",
    description: "Composition sérif centrée, fond ivoire et QR code encadré.",
    background: "#fffdf8",
    accent: "#f2c3b2",
    accentDark: "#151412",
    headline: "#111111",
    headlineStroke: "none",
    headlineTextColor: "#111111",
    headlineFontSizePx: 84,
    qrFrame: "#f3c0ad",
    logoVariant: "lined",
    wheelX: 0,
    wheelY: 0,
    wheelRadius: 0,
    qrX: 210,
    qrY: 638,
    qrSize: 340,
    ctaX: 0,
    ctaY: 0,
    ctaWidth: 0,
    ctaHeight: 0,
    ctaRotation: 0,
    headlineY: 260,
    headlineSizeMultiplier: 1.68,
    colorsCustomizable: false,
    headlineX: 397,
    headlineMaxWidth: 642,
    subtitleMaxWidth: 642,
    headlineBlockBottom: 590,
    headlineLogoGapPx: 18,
    headlineFontWeight: 600,
    headlineLineHeightMultiplier: 1.0,
    headlineItalic: false,
    headlineFontFamily: "cormorant",
    headlineTextAnchor: "middle",
    logoX: 397,
    logoFontWeight: 400,
    logoLetterSpacing: 0,
    logoFontFamily: "cormorant",
    logoTextAnchor: "middle",
    logoImageAnchor: "middle",
    logoUnderlineWidth: 72,
    logoUnderlineColor: "#191817",
    logoUnderlineCentered: true,
    logoUnderlineGapPx: 68,
    logoUnderlineStrokeWidth: 3,
    supportingTextX: 397,
    supportingTextY: 528,
    supportingTextFontFamily: "inter",
    supportingTextFontSize: 24,
    supportingTextLineHeight: 32,
    supportingTextColor: "#171614",
    supportingTextLetterSpacing: 1.2,
    backgroundOnly: true,
    wheel: {
      winColor: "#f2c3b2",
      alternateWinColor: "#fffdf8",
      loseColor: "#fffdf8",
      alternateLoseColor: "#fffdf8",
      rimColor: "#f2c3b2",
    },
  },
];

export const POSTER_TEMPLATE_CONFIGS: Record<PosterTemplateId, PosterTemplateConfig> =
  Object.fromEntries(POSTER_TEMPLATES.map((template) => [template.id, template])) as Record<
    PosterTemplateId,
    PosterTemplateConfig
  >;

const POSTER_TEMPLATE_BY_ID = Object.fromEntries(
  POSTER_TEMPLATES.map((template) => [template.id, template]),
) as Record<PosterTemplateId, PosterTemplateConfig>;

// Gradient clair and Terracotta are background variations of Classique.
export const POSTER_TEMPLATE_CHOICES = [
  ...POSTER_TEMPLATES.filter(
    (template) => !["soft-gradient-wheel", "terracotta-wheel", "classic-wheel"].includes(template.id),
  ),
  POSTER_TEMPLATE_BY_ID["classic-wheel"],
];

const MOTIF_TEMPLATE_IDS: Record<PosterBackgroundMotif, PosterTemplateId> = {
  plain: "classic-wheel",
  "soft-gradient": "soft-gradient-wheel",
  terracotta: "terracotta-wheel",
};

export function getPosterTemplate(
  templateId?: PosterTemplateId,
  backgroundMotif?: PosterBackgroundMotif,
) {
  const normalizedId = templateId ?? "classic-wheel";
  const motifTemplateId =
    normalizedId === "classic-wheel" && backgroundMotif
      ? MOTIF_TEMPLATE_IDS[backgroundMotif]
      : normalizedId;

  return POSTER_TEMPLATE_CONFIGS[motifTemplateId] ?? POSTER_TEMPLATE_CONFIGS["classic-wheel"];
}
