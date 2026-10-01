import type { GamePageTemplateId, TextFont } from "@/lib/types";

export const BEAUTY_SCRATCH_TEMPLATES = [
  {
    id: "beauty-scratch-nude",
    name: "Nude Élégance",
    description: "Crème, sable et détails fins pour un rendu intemporel.",
    background: "/images/scratch-templates/beauty-nude-elegance.webp",
    scratch: { base: "#b99a6a", highlight: "#e4d0aa", edge: "#fff7e9" },
    text: "#49372c",
    font: "playfair",
    fontClass: "font-playfair",
  },
  {
    id: "beauty-scratch-botanical",
    name: "Botanique Premium",
    description: "Ivoire et feuillages sauge, naturel et apaisant.",
    background: "/images/scratch-templates/beauty-botanical-premium.webp",
    scratch: { base: "#9ba58a", highlight: "#cbd0b9", edge: "#f4f2e6" },
    text: "#26392e",
    font: "cormorant",
    fontClass: "font-cormorant",
  },
  {
    id: "beauty-scratch-noir-or",
    name: "Noir & Or Signature",
    description: "Noir mat et champagne doré, sobre et exclusif.",
    background: "/images/scratch-templates/beauty-noir-or.webp",
    scratch: { base: "#a17a3d", highlight: "#d5b671", edge: "#f0dfb8" },
    text: "#f6e7c6",
    font: "bodoni",
    fontClass: "font-bodoni",
  },
  {
    id: "beauty-scratch-lilas",
    name: "Lilas Soin Doux",
    description: "Lavande et ivoire dans une ambiance douce et sereine.",
    background: "/images/scratch-templates/beauty-lilas-soin-doux.webp",
    scratch: { base: "#8e7b9d", highlight: "#c9bdd2", edge: "#f4eefa" },
    text: "#49384f",
    font: "playfair",
    fontClass: "font-playfair",
  },
  {
    id: "beauty-scratch-corail",
    name: "Corail Lumière",
    description: "Pêche et corail lumineux, chaleureux et contemporain.",
    background: "/images/scratch-templates/beauty-corail-lumiere.webp",
    scratch: { base: "#c96e54", highlight: "#efa184", edge: "#fff0e5" },
    text: "#573126",
    font: "lato",
    fontClass: "font-lato",
  },
] as const satisfies ReadonlyArray<{
  id: GamePageTemplateId;
  name: string;
  description: string;
  background: string;
  scratch: { base: string; highlight: string; edge: string };
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
