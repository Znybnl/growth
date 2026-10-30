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

export const CHRISTMAS_SCRATCH_TEMPLATES = [
  { id: "scratch-christmas-rose", wheelId: "christmas-rose", scratch: { base: "#c6a0aa", highlight: "#f4e3e5", edge: "#fff5ef", texture: "/images/scratch-templates/beauty-foil-lilas.webp", textureOpacity: .28 } },
  { id: "scratch-christmas-natural", wheelId: "christmas-natural", scratch: { base: "#b69a63", highlight: "#eee1c4", edge: "#fff9eb", texture: "/images/scratch-templates/beauty-foil-botanical.webp", textureOpacity: .32 } },
  { id: "scratch-christmas-traditional", wheelId: "christmas-traditional", scratch: { base: "#a98444", highlight: "#f0dca0", edge: "#fff0c4", texture: "/images/scratch-templates/beauty-foil-noir-or.webp", textureOpacity: .28 } },
  {
    id: "scratch-christmas-evergreen",
    name: "Noël sapin & cadeaux",
    description: "Sapin profond, rubans rouges et cadeaux lumineux.",
    background: "/images/scratch-templates/christmas-evergreen-background.webp",
    backgroundColor: "#f5eddd",
    text: "#173c34",
    logo: "#173c34",
    font: "fredoka",
    scratchShape: "brush",
    scratch: { base: "#b58a43", highlight: "#f0cf83", edge: "#fff2d0", texture: "/images/scratch-templates/beauty-foil-noir-or.webp", textureOpacity: .43 },
  },
  {
    id: "scratch-christmas-champagne",
    name: "Noël champagne",
    description: "Ivoire lumineux, rubans et détails champagne.",
    background: "/images/scratch-templates/christmas-champagne-background.webp",
    backgroundColor: "#fbf4e8",
    text: "#263d37",
    logo: "#8f6931",
    font: "cormorant",
    scratchShape: "brush",
    scratch: { base: "#bb9148", highlight: "#f4d99b", edge: "#fff6e3", texture: "/images/scratch-templates/beauty-foil-nude.webp", textureOpacity: .44 },
  },
  {
    id: "scratch-christmas-retro",
    name: "Noël rétro",
    description: "Rayons colorés, rouge festif et esprit affiche vintage.",
    background: "/images/scratch-templates/christmas-retro-background.webp",
    backgroundColor: "#f5e9ce",
    text: "#ad2925",
    logo: "#3b5547",
    font: "fredoka",
    scratchShape: "ticket",
    scratch: { base: "#aeb7bd", highlight: "#f4f0df", edge: "#fff0b8", textureOpacity: .5 },
  },
  {
    id: "scratch-christmas-noir-or",
    name: "Noël noir & or",
    description: "Fond noir profond, rubans de satin et éclats dorés.",
    background: "/images/scratch-templates/christmas-noir-or-background.webp",
    backgroundColor: "#100f0d",
    text: "#f8f0df",
    logo: "#e5c77c",
    font: "bodoni",
    scratchShape: "brush",
    scratch: { base: "#ae813b", highlight: "#f4d78e", edge: "#fff0c3", texture: "/images/scratch-templates/beauty-foil-noir-or.webp", textureOpacity: .46 },
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
    fontClass: item.font === "fredoka" ? "font-fredoka" : item.font === "cormorant" ? "font-cormorant" : "font-bodoni",
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
