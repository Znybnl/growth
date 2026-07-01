export const INDUSTRY_OPTIONS = [
  "Restauration",
  "Retail",
  "Beauté",
  "Automobile",
  "Sport",
  "Services",
  "Hôtellerie",
] as const;

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
  return isRestaurantIndustry(industry) ? "restaurant" : "boutique";
}
