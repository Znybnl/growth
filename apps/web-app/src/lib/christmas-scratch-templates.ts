import type { TextFont } from "@/lib/types";
import { christmasWheelArtwork, christmasWheelTheme } from "@/lib/christmas-wheel-themes";
import { userBackgroundImageStyle } from "@/lib/campaign-background";

type ScratchFinish = {
  base: string;
  highlight: string;
  edge: string;
  texture?: string;
  textureOpacity: number;
};

type WheelBasedTemplate = {
  id: string;
  wheelId: "christmas-rose" | "christmas-natural" | "christmas-traditional";
  scratch: ScratchFinish;
};

type IllustratedTemplate = {
  id: string;
  name: string;
  description: string;
  background: string;
  backgroundColor: string;
  text: string;
  logo: string;
  font: TextFont;
  scratchShape: "brush" | "ticket";
  scratch: ScratchFinish;
};

// Keep the historical IDs for campaigns already using the original PR #726.
// The four illustrated styles below are neutral festive designs, not seasonal templates.
export const CHRISTMAS_SCRATCH_TEMPLATES = [
  { id: "scratch-christmas-rose", wheelId: "christmas-rose", scratch: { base: "#c6a0aa", highlight: "#f4e3e5", edge: "#fff5ef", texture: "/images/scratch-templates/beauty-foil-lilas.webp", textureOpacity: .28 } },
  { id: "scratch-christmas-natural", wheelId: "christmas-natural", scratch: { base: "#b69a63", highlight: "#eee1c4", edge: "#fff9eb", texture: "/images/scratch-templates/beauty-foil-botanical.webp", textureOpacity: .32 } },
  { id: "scratch-christmas-traditional", wheelId: "christmas-traditional", scratch: { base: "#a98444", highlight: "#f0dca0", edge: "#fff0c4", texture: "/images/scratch-templates/beauty-foil-noir-or.webp", textureOpacity: .28 } },
  {
    id: "scratch-christmas-evergreen",
    name: "Vert bouteille & rubans",
    description: "Papier vert profond, rubans rouges et paquets cadeaux.",
    background: "/images/scratch-templates/festive-gift-wrap-green-background.webp",
    backgroundColor: "#f5eddd",
    text: "#173c34",
    logo: "#173c34",
    font: "fredoka",
    scratchShape: "brush",
    scratch: { base: "#bd965d", highlight: "#dfc08b", edge: "#fff1d4", texture: "/images/scratch-templates/beauty-foil-nude.webp", textureOpacity: .12 },
  },
  {
    id: "scratch-christmas-champagne",
    name: "Ivoire & champagne",
    description: "Rubans dorés satinés et paquet cadeau sur fond ivoire.",
    background: "/images/scratch-templates/festive-champagne-ribbons-background.webp",
    backgroundColor: "#fbf4e8",
    text: "#263d37",
    logo: "#8f6931",
    font: "playfair",
    scratchShape: "brush",
    scratch: { base: "#c6a775", highlight: "#e7d2ab", edge: "#fff6e3", texture: "/images/scratch-templates/beauty-foil-nude.webp", textureOpacity: .14 },
  },
  {
    id: "scratch-christmas-retro",
    name: "Rayons rétro",
    description: "Rayons corail, turquoise et safran façon affiche vintage.",
    background: "/images/scratch-templates/festive-retro-rays-background-v2.webp",
    backgroundColor: "#f5e9ce",
    text: "#ad2925",
    logo: "#3b5547",
    font: "playfair",
    scratchShape: "ticket",
    scratch: { base: "#aeb7bd", highlight: "#f4f0df", edge: "#fff0b8", textureOpacity: .5 },
  },
  {
    id: "scratch-christmas-noir-or",
    name: "Satin noir & or",
    description: "Rubans métallisés et éclats dorés sur fond noir profond.",
    background: "/images/scratch-templates/festive-black-gold-ribbons-background.webp",
    backgroundColor: "#100f0d",
    text: "#f8f0df",
    logo: "#e5c77c",
    font: "bodoni",
    scratchShape: "brush",
    scratch: { base: "#ae813b", highlight: "#f4d78e", edge: "#fff0c3", texture: "/images/scratch-templates/beauty-foil-noir-or.webp", textureOpacity: .24 },
  },
] as const satisfies readonly (WheelBasedTemplate | IllustratedTemplate)[];

export type ChristmasScratchTemplateId = (typeof CHRISTMAS_SCRATCH_TEMPLATES)[number]["id"];

type ChristmasScratchTheme = {
  id: ChristmasScratchTemplateId;
  name: string;
  description: string;
  background: string;
  backgroundColor: string;
  text: string;
  logo: string;
  sampleHeadline: string;
  sampleSubline: string;
  font: TextFont;
  fontClass: string;
  scratchShape?: "brush" | "ticket";
  scratch: ScratchFinish;
};

const themes: ChristmasScratchTheme[] = CHRISTMAS_SCRATCH_TEMPLATES.map((item) => {
  if ("wheelId" in item) {
    const wheel = christmasWheelTheme(item.wheelId)!;
    return {
      ...item,
      id: item.id,
      name: wheel.name,
      description: wheel.description,
      background: christmasWheelArtwork(item.wheelId),
      backgroundColor: wheel.background,
      text: wheel.text,
      logo: wheel.logo,
      sampleHeadline: "Grattez & gagnez",
      sampleSubline: "De belles surprises vous attendent pour Noël",
      font: "bodoni",
      fontClass: "font-bodoni",
    };
  }
  return {
    ...item,
    id: item.id,
    sampleHeadline: "Jouez & gagnez",
    sampleSubline: "Une surprise vous attend !",
    fontClass: item.font === "fredoka" ? "font-fredoka" : item.font === "playfair" ? "font-playfair" : "font-bodoni",
  };
});

export function christmasScratchTemplate(templateId?: string | null) {
  return themes.find((theme) => theme.id === templateId);
}

export function christmasScratchDefaultBackground(templateId: string, background: { mode: string; color?: string; imageUrl?: string | null }) {
  const theme = christmasScratchTemplate(templateId);
  if (!theme || (background.mode === "image" && background.imageUrl?.trim())) return undefined;
  return !background.color || background.color.toLowerCase() === theme.backgroundColor ? theme.background : undefined;
}

export function christmasScratchBackgroundImage(templateId: string, background: { mode: string; color?: string; imageUrl?: string | null }) {
  if (!christmasScratchTemplate(templateId)) return undefined;
  if (background.mode === "image" && background.imageUrl) return userBackgroundImageStyle(background.imageUrl);
  const native = christmasScratchDefaultBackground(templateId, background);
  return native ? userBackgroundImageStyle(native) : "none";
}
