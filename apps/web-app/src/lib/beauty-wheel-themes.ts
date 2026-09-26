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

export function beautyWheelButtonTextColor(templateId: BeautyWheelTemplateId, background: string, preferred?: string) {
  const theme = beautyWheelTheme(templateId)!;
  const normalizedBackground = background.toLowerCase();
  const usesWhiteOnDefaultAccent = ["beauty-nude", "beauty-pop", "beauty-botanical"].includes(templateId);

  if (usesWhiteOnDefaultAccent && normalizedBackground === theme.primary) return "#ffffff";
  return beautyWheelLegibleText(background, preferred);
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
      return `radial-gradient(ellipse 74% 36% at 104% -2%, ${translucent(primary, 0.14)}, transparent 78%), radial-gradient(ellipse 48% 28% at -10% 98%, ${translucent(primary, 0.09)}, transparent 82%), linear-gradient(145deg, rgba(255,255,255,.34) 0%, transparent 46%, rgba(185,144,82,.035) 100%), linear-gradient(180deg, ${base}, ${base})`;
    case "beauty-botanical":
      return `radial-gradient(ellipse 56% 34% at -12% 74%, ${translucent(primary, 0.2)}, transparent 78%), radial-gradient(ellipse 46% 28% at 110% 8%, ${translucent(primary, 0.14)}, transparent 80%), radial-gradient(ellipse 38% 22% at 104% 56%, ${translucent(primary, 0.085)}, transparent 82%), linear-gradient(165deg, rgba(255,255,255,.28), transparent 42%, rgba(141,164,128,.035)), linear-gradient(180deg, ${base}, ${base})`;
    case "beauty-pop":
      return `radial-gradient(ellipse 47% 30% at 106% 6%, ${translucent(primary, 0.2)} 0 26%, transparent 78%), radial-gradient(ellipse 48% 29% at -8% 96%, rgba(255,155,82,.16) 0 24%, transparent 78%), radial-gradient(ellipse 30% 18% at 100% 52%, ${translucent(primary, 0.09)}, transparent 82%), linear-gradient(145deg, ${base} 0%, ${base} 56%, #fff8f3 100%)`;
    case "beauty-editorial":
      return `radial-gradient(ellipse 72% 40% at 108% 96%, rgba(185,144,82,.1), transparent 80%), radial-gradient(ellipse 60% 35% at 4% 0%, rgba(255,255,255,.6), transparent 78%), linear-gradient(107deg, ${translucent(primary, 0.05)} 0 18%, transparent 18.2% 100%), linear-gradient(180deg, ${base}, ${base})`;
    case "beauty-tech":
      return `radial-gradient(ellipse 78% 42% at 50% 89%, ${translucent(primary, 0.24)}, transparent 76%), radial-gradient(ellipse 48% 32% at 108% 11%, ${translucent(primary, 0.16)}, transparent 78%), radial-gradient(ellipse 34% 24% at -8% 42%, ${translucent(primary, 0.085)}, transparent 80%), linear-gradient(160deg, ${base} 0%, #24183a 100%)`;
  }
}
