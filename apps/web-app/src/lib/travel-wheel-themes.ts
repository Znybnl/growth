import type { GamePageTemplateId } from "@/lib/types";

export const TRAVEL_WHEEL_THEMES = [
  { id: "travel-elegant", name: "Voyage élégant", description: "Passeport vert et dorures", artwork: "/images/templates/travel/elegant.webp", primary: "#124b35", secondary: "#f9ead1", third: "#124b35", background: "#f9ead1", text: "#123c2e", logo: "#123c2e", button: "#124b35", rim: "#c89535" },
  { id: "travel-tropical", name: "Vacances tropicales", description: "Lagon turquoise et plage ensoleillée", artwork: "/images/templates/travel/tropical.webp", primary: "#00a99e", secondary: "#fff1d8", third: "#50c1bb", background: "#a5e5e5", text: "#ffffff", logo: "#065360", button: "#006c66", rim: "#e9a72d" },
  { id: "travel-roadtrip", name: "Road trip", description: "Montagnes, route et coucher de soleil", artwork: "/images/templates/travel/roadtrip.webp", primary: "#c84922", secondary: "#ffebca", third: "#31808a", background: "#ffebca", text: "#a63718", logo: "#082d4a", button: "#c84922", rim: "#e5a337" },
] as const satisfies ReadonlyArray<{ id: GamePageTemplateId; name: string; description: string; artwork: string; primary: string; secondary: string; third: string; background: string; text: string; logo: string; button: string; rim: string }>;

export function travelWheelTheme(templateId?: GamePageTemplateId) {
  return TRAVEL_WHEEL_THEMES.find((theme) => theme.id === templateId);
}

export function isTravelWheelTemplate(templateId?: GamePageTemplateId) {
  return Boolean(travelWheelTheme(templateId));
}
