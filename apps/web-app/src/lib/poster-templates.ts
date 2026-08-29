import { CampaignPosterSettings, PosterTemplateId } from "@/lib/types";

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
    ctaY: 812,
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
    ctaY: 812,
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
    ctaY: 812,
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
];

export const POSTER_TEMPLATE_CONFIGS: Record<PosterTemplateId, PosterTemplateConfig> =
  Object.fromEntries(POSTER_TEMPLATES.map((template) => [template.id, template])) as Record<
    PosterTemplateId,
    PosterTemplateConfig
  >;

export function getPosterTemplate(templateId?: PosterTemplateId) {
  return POSTER_TEMPLATE_CONFIGS[templateId ?? "classic-wheel"] ?? POSTER_TEMPLATE_CONFIGS["classic-wheel"];
}
