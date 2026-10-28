import { christmasWheelArtwork, christmasWheelTheme } from "@/lib/christmas-wheel-themes";
import { userBackgroundImageStyle } from "@/lib/campaign-background";

/** Reuse the festive backgrounds and the original, already shipped foil textures. */
export const CHRISTMAS_SCRATCH_TEMPLATES = [
  { id: "scratch-christmas-rose", wheelId: "christmas-rose", scratch: { base: "#c6a0aa", highlight: "#f4e3e5", edge: "#fff5ef", texture: "/images/scratch-templates/beauty-foil-lilas.webp", textureOpacity: .28 } },
  { id: "scratch-christmas-natural", wheelId: "christmas-natural", scratch: { base: "#b69a63", highlight: "#eee1c4", edge: "#fff9eb", texture: "/images/scratch-templates/beauty-foil-botanical.webp", textureOpacity: .32 } },
  { id: "scratch-christmas-traditional", wheelId: "christmas-traditional", scratch: { base: "#a98444", highlight: "#f0dca0", edge: "#fff0c4", texture: "/images/scratch-templates/beauty-foil-noir-or.webp", textureOpacity: .28 } },
] as const;

export type ChristmasScratchTemplateId = typeof CHRISTMAS_SCRATCH_TEMPLATES[number]["id"];

const themes = CHRISTMAS_SCRATCH_TEMPLATES.map(item => {
  const wheel = christmasWheelTheme(item.wheelId)!;
  return {
    ...item, name: wheel.name, description: wheel.description, background: christmasWheelArtwork(item.wheelId),
    backgroundColor: wheel.background, text: wheel.text, logo: wheel.logo,
    sampleHeadline: "Grattez & gagnez", sampleSubline: "De belles surprises vous attendent pour Noël",
    font: "bodoni" as const, fontClass: "font-bodoni",
  };
});

export function christmasScratchTemplate(templateId?: string | null) {
  return themes.find(theme => theme.id === templateId);
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
