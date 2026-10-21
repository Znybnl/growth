import type { CampaignRewardRules } from "@/lib/types";

type BudgetPrize = { probability: number; estimatedUnitCost: number; estimatedUnitCostKnown?: boolean; totalQuantity: number | null };
export function isPrizeCostKnown(prize: Pick<BudgetPrize, "estimatedUnitCost" | "estimatedUnitCostKnown">) {
  return prize.estimatedUnitCostKnown !== false && Number.isFinite(prize.estimatedUnitCost) && prize.estimatedUnitCost >= 0;
}

export function calculatePrizeBudget(prizes: readonly BudgetPrize[]) {
  const total = prizes.reduce((sum, prize) => sum + prize.probability, 0);
  const valid = Number.isFinite(total) && total <= 100.0001
    && prizes.every((prize) => Number.isFinite(prize.probability) && prize.probability >= 0 && prize.probability <= 100);
  const missingCostIndexes = prizes.flatMap((prize, index) => prize.probability > 0 && !isPrizeCostKnown(prize) ? [index] : []);
  const complete = missingCostIndexes.length === 0;
  const average = valid && complete ? prizes.reduce((sum, prize) => prize.probability > 0 ? sum + prize.probability / 100 * prize.estimatedUnitCost : sum, 0) : null;
  return { valid, complete, missingCostIndexes, average, projection100: average === null ? null : average * 100,
    hasLimitedStock: prizes.some((prize) => prize.probability > 0 && prize.totalQuantity !== null) };
}

export type PrizeRuleField = "availabilityDurationDays" | "participationIntervalDays" | "availableAfterHours";
// Existing server bounds, not new date/withdrawal rules. Undefined retains legacy defaults.
export function prizeRuleErrors(rules: Partial<Pick<CampaignRewardRules, PrizeRuleField>>) {
  const errors: Partial<Record<PrizeRuleField, string>> = {};
  for (const [key, min, max, label] of [
    ["availabilityDurationDays", 0, 365, "La durée de validité"],
    ["participationIntervalDays", 1, 365, "Le délai entre deux participations"],
    ["availableAfterHours", 0, 8760, "Le délai de disponibilité en heures"],
  ] as const) {
    const value = rules[key];
    if (value !== undefined && (!Number.isSafeInteger(value) || value < min || value > max))
      errors[key] = `${label} doit être un nombre entier compris entre ${min} et ${max}.`;
  }
  return errors;
}
