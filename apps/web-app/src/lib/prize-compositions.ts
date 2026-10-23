import { prizeFieldsFromSuggestion } from "@/lib/prize-suggestion-fields";
import type { PrizeSuggestion } from "@/lib/types";
import recipes from "./prize-composition-recipes.json" with { type: "json" };
import { GENERAL_BEAUTY_SUBSECTOR, isLegacyBeautySubsector, normalizeBeautySubsector } from "@/lib/merchant-options";

export type PrizeCompositionContext = { industry?: string; industrySubsector?: string; restaurantType?: string };

export type PrizeComposition = {
  id: string;
  name: string;
  description: string;
  prizes: PrizeSuggestion[];
  winningProbability: number;
  losingProbability: number;
  averageCost: number;
};

const profiles = [
  { id: "budget", name: "Budget maîtrisé", description: "Deux avantages simples, avec une part gagnante de 40 %.", slots: ["small", "extra"], chances: [25, 15] },
  { id: "balanced", name: "Équilibré", description: "Trois récompenses complémentaires pour démarrer. Notre recommandation.", slots: ["small", "extra", "gift"], chances: [35, 25, 10] },
  { id: "generous", name: "Généreux", description: "Une remise plus attractive et un avantage à chaque participation.", slots: ["large", "extra", "gift"], chances: [50, 30, 20] },
] as const;

// Restaurant types share a catalog, not an invented Beauty subsector or a new taxonomy.
export const restaurantCompositionVariants: Record<string, "coffee" | "extra" | "drink"> = {
  Brasserie: "drink", Pizzeria: "drink", "Restauration rapide": "extra", Gastronomique: "coffee",
  "Bar à tapas": "drink", "Cuisine traditionnelle": "drink", "Cuisine du monde": "drink",
  Boulangerie: "coffee", Glacier: "extra", Bistrot: "drink", "Coffee shop": "coffee",
  "Food court": "drink", "Dark kitchen": "extra",
};

export function prizeCompositionRecipe(context: PrizeCompositionContext) {
  const raw = context.industry?.trim();
  const industry = raw?.toLowerCase() === "restaurant" || raw?.toLowerCase() === "restauration" ? "Restauration" : raw;
  const sub = normalizeBeautySubsector(context.industrySubsector);
  const subsector = !sub || isLegacyBeautySubsector(sub) ? GENERAL_BEAUTY_SUBSECTOR : sub;
  const recipe = recipes.find((item) => item.industry === industry && (industry !== "Beauté" || item.subsector === subsector));
  if (!recipe) return null;
  if (industry !== "Restauration") return recipe;
  const type = context.restaurantType?.trim() ?? "";
  const variant = Object.hasOwn(restaurantCompositionVariants, type) ? restaurantCompositionVariants[type] : "drink";
  return { ...recipe, extra: `ps-623-food-${variant}` };
}

/** Input is the existing, scoped activity catalog; no parallel rewards catalog.
 * Probabilities here are indicative proposals, never an automatic rebalance of a game. */
export function buildPrizeCompositions(suggestions: readonly PrizeSuggestion[], context: PrizeCompositionContext = suggestions[0] ?? {}): PrizeComposition[] {
  const recipe = prizeCompositionRecipe(context);
  if (!recipe) return [];
  const eligible = suggestions.filter((item) => {
    if (item.industry !== recipe.industry || (recipe.industry === "Beauté" && item.industrySubsector !== recipe.subsector)
      || !item.isActive || !item.label.trim() || /^perdu\s*!?$/i.test(item.label.trim())
      || !Number.isFinite(item.estimatedUnitCost) || item.estimatedUnitCost < 0 || item.estimatedUnitCost > 100000
      || !Number.isFinite(item.probability) || item.probability < 0 || item.probability > 100) return false;
    return true;
  });
  if (!eligible.length) return [];
  return profiles.flatMap((profile) => {
    const chosen = profile.slots.map((slot) => eligible.find((item) => item.id === recipe[slot]));
    // Missing/deactivated/renamed duplicate standards are never replaced with invented rewards.
    if (chosen.some((item) => !item)) return [];
    const signatures = chosen.map((item) => JSON.stringify([item!.label.trim().toLocaleLowerCase("fr"), item!.description.trim().toLocaleLowerCase("fr")]));
    if (new Set(signatures).size !== chosen.length) return [];
    const prizes = chosen.map((item, index) => ({ ...item!, probability: profile.chances[index] }));
    const total = prizes.reduce((sum, item) => sum + item.probability, 0);
    return [{ id: profile.id, name: profile.name, description: profile.description, prizes,
      winningProbability: total, losingProbability: 100 - total,
      averageCost: prizes.reduce((total, item) => total + item.estimatedUnitCost * item.probability / 100, 0) }];
  });
}

export function copyPrizeComposition(composition: PrizeComposition, scope: string) {
  // New IDs even when the same profile is applied twice; never reuse persisted stock/IDs.
  return composition.prizes.map((suggestion) => ({
    ...prizeFieldsFromSuggestion(suggestion),
    id: `${scope}-composition-${crypto.randomUUID()}`,
    remainingQuantity: null,
  }));
}
