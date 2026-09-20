import { CampaignPosterSettings, PosterTemplateId, TextFont } from "@/lib/types";

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
  colorsCustomizable?: boolean;
  headlineX?: number;
  headlineMaxWidth?: number;
  headlineFontWeight?: number;
  headlineItalic?: boolean;
  headlineFontFamily?: TextFont;
  logoX?: number;
  logoY?: number;
  logoFontWeight?: number;
  logoLetterSpacing?: number;
  logoFontFamily?: TextFont;
  logoTextAnchor?: "start" | "middle";
  logoUnderlineWidth?: number;
  logoUnderlineColor?: string;
  inlineQrCta?: boolean;
  inlineQrLabelBackground?: string;
  inlineQrLabelTextColor?: string;
  inlineQrLabelWidth?: number;
  inlineQrLabelHeight?: number;
  inlineQrLabelGap?: number;
  supportingText?: string;
  supportingTextX?: number;
  supportingTextY?: number;
  supportingTextFontFamily?: TextFont;
  supportingTextFontSize?: number;
  supportingTextLineHeight?: number;
  supportingTextColor?: string;
  supportingTextLetterSpacing?: number;
  footerVariant?: "premium" | "botanical";
  backdropAsset?: string;
  wheelOnly?: boolean;
  wheel: CampaignPosterSettings["wheel"];
};

export const POSTER_TEMPLATES: PosterTemplateConfig[] = [
  {
    id: "classic-wheel",
    label: "Classique blanc",
    description: "Fond clair uni, avec titre impactant.",
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
    description: "Design élégant et titre avec contour blanc.",
    background: "#f4f3ff",
    accent: "#2100b8",
    accentDark: "#060642",
    headline: "#050644",
    headlineStroke: "#ffffff",
    headlineTextColor: "#050644",
    headlineFontSizePx: 40,
    qrFrame: "#2100b8",
    logoVariant: "badge",
    wheelX: 272,
    wheelY: 716,
    wheelRadius: 260,
    qrX: 408,
    qrY: 512,
    qrSize: 292,
    ctaX: 369,
    ctaY: 838,
    ctaWidth: 370,
    ctaHeight: 86,
    ctaRotation: 0,
    headlineY: 250,
    headlineSizeMultiplier: 1.52,
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
    headlineY: 232,
    headlineSizeMultiplier: 1.18,
    colorsCustomizable: false,
    headlineX: 284,
    headlineMaxWidth: 466,
    headlineFontWeight: 500,
    headlineItalic: false,
    headlineFontFamily: "cormorant",
    logoX: 516,
    logoY: 12,
    logoFontWeight: 500,
    logoLetterSpacing: 5,
    inlineQrCta: true,
    backdropAsset: "premium-poster-backdrop.png",
    footerVariant: "premium",
    wheelOnly: true,
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
    headlineFontWeight: 500,
    headlineItalic: false,
    headlineFontFamily: "cormorant",
    logoX: 72,
    logoY: 34,
    logoFontWeight: 500,
    logoLetterSpacing: 5,
    logoFontFamily: "syncopate",
    logoTextAnchor: "start",
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
    wheelOnly: true,
    wheel: {
      winColor: "#718578",
      alternateWinColor: "#718578",
      loseColor: "#f6f3ed",
      alternateLoseColor: "#f6f3ed",
      rimColor: "#718578",
    },
  },
];

export const POSTER_TEMPLATE_CONFIGS: Record<PosterTemplateId, PosterTemplateConfig> =
  Object.fromEntries(POSTER_TEMPLATES.map((template) => [template.id, template])) as Record<
    PosterTemplateId,
    PosterTemplateConfig
  >;

export function getPosterTemplate(templateId?: PosterTemplateId) {
  return POSTER_TEMPLATE_CONFIGS[templateId ?? "classic-wheel"] ?? POSTER_TEMPLATE_CONFIGS["classic-wheel"];
}
