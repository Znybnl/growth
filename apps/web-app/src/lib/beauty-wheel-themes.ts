import type { GamePageTemplateId, TextFont } from "@/lib/types";

export const BEAUTY_WHEEL_THEMES = [
  { id: "beauty-rose", name: "Rose poudré", tagline: "Doux & élégant", primary: "#d58a9a", secondary: "#fff7f8", background: "#fff7f8", text: "#512d3b", font: "cormorant" },
  { id: "beauty-nude", name: "Nude & Or", tagline: "Minimal & premium", primary: "#b99052", secondary: "#f8f3ea", background: "#f8f3ea", text: "#47382c", font: "playfair" },
  { id: "beauty-botanical", name: "Botanical", tagline: "Naturel & apaisant", primary: "#8da480", secondary: "#f6f7f1", background: "#f6f7f1", text: "#254238", font: "dm-sans" },
  { id: "beauty-pop", name: "Beauty Pop", tagline: "Vif & ludique", primary: "#ff4f87", secondary: "#fff2f5", background: "#fff2f5", text: "#4b2440", font: "poppins" },
  { id: "beauty-editorial", name: "Éditorial chic", tagline: "Sophistiqué & mode", primary: "#171614", secondary: "#f4f0e8", background: "#f4f0e8", text: "#171614", font: "bodoni" },
  { id: "beauty-tech", name: "Beauty Tech", tagline: "Moderne & lumineux", primary: "#7c4dff", secondary: "#24183a", background: "#171126", text: "#f8f5ff", font: "space-grotesk" },
] as const satisfies ReadonlyArray<{
  id: GamePageTemplateId;
  name: string;
  tagline: string;
  primary: string;
  secondary: string;
  background: string;
  text: string;
  font: TextFont;
}>;

export type BeautyWheelTemplateId = (typeof BEAUTY_WHEEL_THEMES)[number]["id"];

const BEAUTY_WHEEL_FONTS: Record<BeautyWheelTemplateId, readonly TextFont[]> = {
  "beauty-rose": ["cormorant", "playfair"],
  "beauty-nude": ["playfair", "cormorant", "bodoni"],
  "beauty-botanical": ["dm-sans", "roboto"],
  "beauty-pop": ["poppins", "fredoka"],
  "beauty-editorial": ["bodoni", "playfair", "cormorant"],
  "beauty-tech": ["space-grotesk", "roboto"],
};

export function beautyWheelFontOptions(templateId?: GamePageTemplateId) {
  return isBeautyWheelTemplate(templateId) ? BEAUTY_WHEEL_FONTS[templateId] : null;
}

export function beautyWheelTheme(templateId?: GamePageTemplateId) {
  return BEAUTY_WHEEL_THEMES.find((theme) => theme.id === templateId);
}

export function isBeautyWheelTemplate(templateId?: GamePageTemplateId): templateId is BeautyWheelTemplateId {
  return Boolean(beautyWheelTheme(templateId));
}

export function isBeautyIndustry(industry?: string | null) {
  return (industry ?? "").trim().toLocaleLowerCase("fr") === "beauté";
}

function luminance(hex: string) {
  const clean = hex.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(clean)) return 0;
  const channels = [0, 2, 4].map((index) => Number.parseInt(clean.slice(index, index + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

export function beautyWheelLegibleText(background: string, preferred?: string) {
  if (preferred && contrastRatio(background, preferred) >= 4.5) return preferred;
  return contrastRatio(background, "#171614") >= contrastRatio(background, "#ffffff") ? "#171614" : "#ffffff";
}

function translucent(hex: string, opacity: number) {
  const clean = hex.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(clean)) return `rgba(141,164,128,${opacity})`;
  const rgb = [0, 2, 4].map((index) => Number.parseInt(clean.slice(index, index + 2), 16));
  return `rgba(${rgb.join(",")},${opacity})`;
}

/** Same background function for the editor and the real mobile game. */
export function beautyWheelBackground(templateId: BeautyWheelTemplateId, backgroundColor: string, primaryColor: string) {
  const base = /^#[\da-f]{6}$/i.test(backgroundColor) ? backgroundColor : beautyWheelTheme(templateId)!.background;
  const primary = /^#[\da-f]{6}$/i.test(primaryColor) ? primaryColor : beautyWheelTheme(templateId)!.primary;
  switch (templateId) {
    case "beauty-rose":
      return `radial-gradient(ellipse 75% 33% at -12% 12%, ${translucent(primary, 0.19)}, transparent 76%), radial-gradient(ellipse 76% 38% at 112% 88%, ${translucent(primary, 0.14)}, transparent 78%), linear-gradient(180deg, ${base}, ${base})`;
    case "beauty-nude":
      return `radial-gradient(ellipse 68% 34% at 104% -4%, ${translucent(primary, 0.12)}, transparent 78%), radial-gradient(ellipse 42% 24% at -12% 100%, ${translucent(primary, 0.07)}, transparent 82%), linear-gradient(132deg, transparent 0 68%, rgba(185,144,82,.06) 68.2%, transparent 68.6%), linear-gradient(180deg, ${base}, ${base})`;
    case "beauty-botanical":
      return `radial-gradient(ellipse 54% 30% at -10% 76%, ${translucent(primary, 0.18)}, transparent 78%), radial-gradient(ellipse 46% 27% at 108% 7%, ${translucent(primary, 0.13)}, transparent 80%), radial-gradient(ellipse 36% 18% at 95% 54%, ${translucent(primary, 0.07)}, transparent 82%), linear-gradient(180deg, ${base}, ${base})`;
    case "beauty-pop":
      return `radial-gradient(ellipse 42% 27% at 104% 6%, ${translucent(primary, 0.18)} 0 28%, transparent 78%), radial-gradient(ellipse 42% 25% at -4% 96%, rgba(255,155,82,.13) 0 28%, transparent 78%), radial-gradient(ellipse 26% 16% at 92% 48%, ${translucent(primary, 0.08)}, transparent 82%), linear-gradient(145deg, ${base} 0%, ${base} 58%, #fff8f3 100%)`;
    case "beauty-editorial":
      return `radial-gradient(ellipse 76% 38% at 108% 100%, rgba(185,144,82,.08), transparent 80%), linear-gradient(107deg, ${translucent(primary, 0.045)} 0 18%, transparent 18.2% 100%), linear-gradient(180deg, ${base}, ${base})`;
    case "beauty-tech":
      return `radial-gradient(ellipse 82% 42% at 50% 88%, ${translucent(primary, 0.27)}, transparent 75%), radial-gradient(circle at 110% 11%, ${translucent(primary, 0.16)}, transparent 34%), linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(160deg, ${base} 0%, #24183a 100%)`;
  }
}
