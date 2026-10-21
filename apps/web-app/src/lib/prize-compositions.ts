import { prizeFieldsFromSuggestion } from "@/lib/prize-suggestion-fields";
import type { PrizeSuggestion } from "@/lib/types";

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
  { id: "budget", name: "Budget maîtrisé", description: "Privilégiez les petits avantages et compléments de prestations pour limiter le coût théorique des gains.", total: 40, count: 2, descendingWeights: true },
  { id: "balanced", name: "Équilibré", description: "Associez des petits avantages fréquents et quelques récompenses plus attractives.", total: 70, count: 3, descendingWeights: true },
  { id: "generous", name: "Généreux", description: "Proposez davantage d’occasions de gagner, avec un budget potentiel plus élevé.", total: 100, count: 4, descendingWeights: false },
] as const;

/** Input is the existing, scoped activity catalog; no parallel rewards catalog.
 * Probabilities here are indicative proposals, never an automatic rebalance of a game. */
export function buildPrizeCompositions(suggestions: readonly PrizeSuggestion[]): PrizeComposition[] {
  const seen = new Set<string>();
  const eligible = suggestions.filter((item) => {
    const key = JSON.stringify([item.label.trim().toLocaleLowerCase("fr"), item.description.trim().toLocaleLowerCase("fr")]);
    if (!item.isActive || !item.label.trim() || /^perdu\s*!?$/i.test(item.label.trim())
      || !Number.isFinite(item.estimatedUnitCost) || item.estimatedUnitCost < 0 || item.estimatedUnitCost > 100000
      || !Number.isFinite(item.probability) || item.probability < 0 || item.probability > 100 || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.estimatedUnitCost - b.estimatedUnitCost || a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  if (!eligible.length) return [];
  return profiles.map((profile) => {
    const chosen = eligible.slice(0, profile.count);
    const weights = chosen.map((_, index) => profile.descendingWeights ? chosen.length - index : 1);
    const sum = weights.reduce((total, weight) => total + weight, 0);
    let allocated = 0;
    const prizes = chosen.map((item, index) => {
      // Hundredths of a point, with the exact residual allocated to the last reward.
      const points = index === chosen.length - 1 ? profile.total * 100 - allocated : Math.floor(profile.total * 100 * weights[index] / sum);
      allocated += points;
      return { ...item, probability: points / 100 };
    });
    return { id: profile.id, name: profile.name, description: profile.description, prizes,
      winningProbability: profile.total, losingProbability: 100 - profile.total,
      averageCost: prizes.reduce((total, item) => total + item.estimatedUnitCost * item.probability / 100, 0) };
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
