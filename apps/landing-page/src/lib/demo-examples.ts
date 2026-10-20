export type DemoSector = "beauty" | "restaurant" | "retail";

export const beautyDemoRewards = {
  nails: { label: "Ongles", reward: "une French offerte", wheelLabel: "French", otherLabels: ["Nail art", "Pose", "French"] },
  eyes: { label: "Regard · cils & sourcils", reward: "une teinture offerte", wheelLabel: "Teinture", otherLabels: ["Kératine", "Brow Lift", "Teinture"] },
  care: { label: "Soins visage & corps", reward: "un masque offert", wheelLabel: "Masque", otherLabels: ["Gommage", "Soin", "Masque"] },
  spa: { label: "Massage & Spa", reward: "10 minutes de massage offertes", wheelLabel: "+10 min", otherLabels: ["Produit", "Remise", "+10 min"] },
  hair: { label: "Coiffure", reward: "un soin offert", wheelLabel: "Soin", otherLabels: ["Brushing", "Remise", "Soin"] },
  general: { label: "Institut généraliste", reward: "un complément de prestation offert", wheelLabel: "Complément", otherLabels: ["Produit", "Remise", "Complément"] },
} as const;

export type BeautyDemoSpecialty = keyof typeof beautyDemoRewards;

export function isBeautyDemoSpecialty(value: string): value is BeautyDemoSpecialty {
  return Object.hasOwn(beautyDemoRewards, value);
}

export const demoSectors = [
  { id: "beauty", label: "Beauté & bien-être" },
  { id: "restaurant", label: "Restaurants & cafés" },
  { id: "retail", label: "Boutiques & commerces" },
] as const;
