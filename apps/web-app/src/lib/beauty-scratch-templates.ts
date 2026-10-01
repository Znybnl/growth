import type { GamePageTemplateId, TextFont } from "@/lib/types";

export const BEAUTY_SCRATCH_TEMPLATES = [
  {
    id: "beauty-scratch-nude",
    name: "Nude Élégance",
    description: "Crème, sable et détails fins pour un rendu intemporel.",
    sampleHeadline: "Grattez et gagnez",
    sampleSubline: "De belles surprises pour prendre soin de vous",
    background: "/images/scratch-templates/beauty-nude-elegance.webp",
    scratch: { base: "#b99a6a", highlight: "#e4d0aa", edge: "#fff7e9", texture: "/images/scratch-templates/beauty-foil-nude.webp", textureOpacity: 0.16 },
    text: "#49372c",
    font: "playfair",
    fontClass: "font-playfair",
  },
  {
    id: "beauty-scratch-botanical",
    name: "Botanique Premium",
    description: "Ivoire et feuillages sauge, naturel et apaisant.",
    sampleHeadline: "Grattez votre cadeau",
    sampleSubline: "Des surprises naturelles pour votre bien-être",
    background: "/images/scratch-templates/beauty-botanical-premium.webp",
    scratch: { base: "#b69a63", highlight: "#e8d8b3", edge: "#fff9eb", texture: "/images/scratch-templates/beauty-foil-botanical.webp", textureOpacity: 0.32 },
    text: "#26392e",
    font: "cormorant",
    fontClass: "font-cormorant",
  },
  {
    id: "beauty-scratch-noir-or",
    name: "Noir & Or Signature",
    description: "Noir mat et champagne doré, sobre et exclusif.",
    sampleHeadline: "Grattez et découvrez",
    sampleSubline: "Des expériences beauté exclusives",
    background: "/images/scratch-templates/beauty-noir-or.webp",
    scratch: { base: "#a17a3d", highlight: "#d5b671", edge: "#f0dfb8", texture: "/images/scratch-templates/beauty-foil-noir-or.webp", textureOpacity: 0.2 },
    text: "#f6e7c6",
    font: "bodoni",
    fontClass: "font-bodoni",
  },
  {
    id: "beauty-scratch-lilas",
    name: "Lilas Soin Doux",
    description: "Lavande et ivoire dans une ambiance douce et sereine.",
    sampleHeadline: "Grattez votre surprise",
    sampleSubline: "Des soins d'exception pour votre bien-être",
    background: "/images/scratch-templates/beauty-lilas-soin-doux.webp",
    scratch: { base: "#a99aae", highlight: "#e9e1eb", edge: "#fffaff", texture: "/images/scratch-templates/beauty-foil-lilas.webp", textureOpacity: 0.22 },
    text: "#49384f",
    font: "playfair",
    fontClass: "font-playfair",
  },
  {
    id: "beauty-scratch-corail",
    name: "Corail Lumière",
    description: "Pêche et corail lumineux, chaleureux et contemporain.",
    sampleHeadline: "Grattez et laissez-vous surprendre",
    sampleSubline: "Des moments beauté qui font du bien",
    background: "/images/scratch-templates/beauty-corail-lumiere.webp",
    scratch: { base: "#b89460", highlight: "#ead8b4", edge: "#fff8eb", texture: "/images/scratch-templates/beauty-foil-corail.webp", textureOpacity: 0.16 },
    text: "#573126",
    font: "playfair",
    fontClass: "font-playfair",
  },
] as const satisfies ReadonlyArray<{
  id: GamePageTemplateId;
  name: string;
  description: string;
  sampleHeadline: string;
  sampleSubline: string;
  background: string;
  scratch: { base: string; highlight: string; edge: string; texture: string; textureOpacity: number };
  text: string;
  font: TextFont;
  fontClass: string;
}>;

export type BeautyScratchTemplateId = (typeof BEAUTY_SCRATCH_TEMPLATES)[number]["id"];

export const IMMERSIVE_SCRATCH_TEMPLATE_IDS = [
  "scratch-vault",
  "scratch-confetti",
  "scratch-coral",
  "scratch-lilac",
  "scratch-sunburst",
  "beauty-scratch-nude",
  "beauty-scratch-botanical",
  "beauty-scratch-noir-or",
  "beauty-scratch-lilas",
  "beauty-scratch-corail",
] as const satisfies readonly GamePageTemplateId[];

/** Retired from new template pickers; existing campaigns may still render them. */
export const HIDDEN_SCRATCH_TEMPLATE_IDS = [
  "scratch-confetti",
  "scratch-sunburst",
] as const satisfies readonly GamePageTemplateId[];

export function isHiddenScratchTemplate(templateId?: string | null) {
  return Boolean(
    templateId &&
      (HIDDEN_SCRATCH_TEMPLATE_IDS as readonly string[]).includes(templateId),
  );
}

export type ImmersiveScratchTemplateId = (typeof IMMERSIVE_SCRATCH_TEMPLATE_IDS)[number];

export function isImmersiveScratchTemplate(
  templateId?: string | null,
): templateId is GamePageTemplateId {
  return Boolean(templateId && (IMMERSIVE_SCRATCH_TEMPLATE_IDS as readonly string[]).includes(templateId));
}

export function isBeautyScratchTemplate(
  templateId?: string | null,
): templateId is BeautyScratchTemplateId {
  return BEAUTY_SCRATCH_TEMPLATES.some((template) => template.id === templateId);
}

export function beautyScratchTemplate(templateId?: string | null) {
  return BEAUTY_SCRATCH_TEMPLATES.find((template) => template.id === templateId);
}
