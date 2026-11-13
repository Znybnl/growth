import type { GamePageTemplateId } from "@/lib/types";

export const TRAVEL_SCRATCH_THEMES = [
  {
    id: "travel-scratch-elegant",
    name: "Voyage élégant",
    description: "Ivoire, vert profond et accents dorés.",
    artwork: "/images/templates/travel/elegant.webp",
    background: "/images/templates/travel/elegant.webp",
    sampleHeadline: "Votre prochaine escapade",
    sampleSubline: "Grattez pour découvrir votre surprise",
    scratch: { base: "#c49a43", highlight: "#f1d98f", edge: "#fff5d9", reveal: "#fff5df", textureOpacity: 0.2 },
    text: "#123c2e",
    font: "playfair",
    fontClass: "font-playfair",
  },
  {
    id: "travel-scratch-tropical",
    name: "Vacances tropicales",
    description: "Turquoise lagon, sable clair et soleil.",
    artwork: "/images/templates/travel/tropical.webp",
    background: "/images/templates/travel/tropical.webp",
    sampleHeadline: "Cap sur les vacances",
    sampleSubline: "Une belle surprise vous attend",
    scratch: { base: "#087e83", highlight: "#40c8bc", edge: "#fff4d6", reveal: "#e7f8f2", textureOpacity: 0.2 },
    text: "#064e59",
    font: "poppins",
    fontClass: "font-poppins",
  },
  {
    id: "travel-scratch-roadtrip",
    name: "Road trip",
    description: "Terracotta, crème et esprit grand départ.",
    artwork: "/images/templates/travel/roadtrip.webp",
    background: "/images/templates/travel/roadtrip.webp",
    sampleHeadline: "L’aventure commence",
    sampleSubline: "Grattez et préparez votre prochain départ",
    scratch: { base: "#b94825", highlight: "#ed9a47", edge: "#fff0d1", reveal: "#fff0d1", textureOpacity: 0.2 },
    text: "#082d4a",
    font: "display",
    fontClass: "font-display",
  },
] as const satisfies ReadonlyArray<{
  id: GamePageTemplateId;
  name: string;
  description: string;
  artwork: string;
  background: string;
  sampleHeadline: string;
  sampleSubline: string;
  scratch: { base: string; highlight: string; edge: string; reveal: string; textureOpacity: number };
  text: string;
  font: "playfair" | "poppins" | "display";
  fontClass: string;
}>;

export function travelScratchTheme(templateId?: GamePageTemplateId | string | null) {
  return TRAVEL_SCRATCH_THEMES.find((theme) => theme.id === templateId);
}
