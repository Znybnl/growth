export const INDUSTRY_OPTIONS = [
  "Beauté",
  "Restauration",
  "Automobile",
  "Retail",
  "Sport",
  "Services",
  "Hôtellerie",
] as const;

export const BEAUTY_INDUSTRY = "Beauté" as const;

export const BEAUTY_SUBSECTOR_OPTIONS = [
  "Beauté généraliste / multi-activité",
  "Coiffure",
  "Ongles",
  "Regard — cils & sourcils",
  "Massage & Spa",
  "Soins visage & corps",
] as const;

export const LEGACY_BEAUTY_SUBSECTORS = ["Institut & soins", "Ongles & cils"] as const;
export const GENERAL_BEAUTY_SUBSECTOR = BEAUTY_SUBSECTOR_OPTIONS[0];

export function normalizeBeautySubsector(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed === "Massage & spa" ? "Massage & Spa" : trimmed;
}

export function isLegacyBeautySubsector(value?: string | null) {
  return LEGACY_BEAUTY_SUBSECTORS.some((option) => option === value);
}

// Historical choices appear only where a saved value actually uses them.
export function beautySubsectorOptions(...usedValues: (string | null | undefined)[]) {
  const legacy = LEGACY_BEAUTY_SUBSECTORS.filter((value) => usedValues.includes(value));
  return [...BEAUTY_SUBSECTOR_OPTIONS, ...legacy,
    ...(usedValues.includes("Massage & spa") ? ["Massage & spa" as const] : [])];
}

export function isBeautyIndustry(industry?: string | null) {
  return (industry ?? "").trim() === BEAUTY_INDUSTRY;
}

export function isBeautySubsector(value?: string | null): boolean {
  const normalized = normalizeBeautySubsector(value);
  return BEAUTY_SUBSECTOR_OPTIONS.some((option) => option === normalized)
    || isLegacyBeautySubsector(normalized);
}

export const RESTAURANT_TYPE_OPTIONS = [
  "Brasserie",
  "Pizzeria",
  "Restauration rapide",
  "Gastronomique",
  "Bar à tapas",
  "Cuisine traditionnelle",
  "Cuisine du monde",
  "Boulangerie",
  "Glacier",
  "Bistrot",
  "Coffee shop",
  "Food court",
  "Dark kitchen",
] as const;

export function isRestaurantIndustry(industry?: string | null) {
  return (industry ?? "").trim().toLowerCase() === "restauration";
}

export function businessLabel(industry?: string | null) {
  return isRestaurantIndustry(industry) ? "restaurant" : "commerce";
}
