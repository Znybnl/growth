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
  "Coiffure",
  "Institut & soins",
  "Ongles & cils",
  "Massage & spa",
] as const;

export function isBeautyIndustry(industry?: string | null) {
  return (industry ?? "").trim() === BEAUTY_INDUSTRY;
}

export function isBeautySubsector(value?: string | null): value is (typeof BEAUTY_SUBSECTOR_OPTIONS)[number] {
  return BEAUTY_SUBSECTOR_OPTIONS.some((option) => option === value);
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
