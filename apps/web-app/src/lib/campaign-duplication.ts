import type { Prize } from "./types";

export type DuplicatedPrizeInput = Pick<
  Prize,
  "label" | "totalQuantity" | "probability" | "estimatedUnitCost" | "purchaseRequired" | "usageConditions"
> & { id: string };

export function buildDuplicatedPrizeInput(prize: Prize, id: string): DuplicatedPrizeInput {
  return {
    id,
    label: prize.label,
    totalQuantity: prize.totalQuantity,
    probability: prize.probability,
    estimatedUnitCost: prize.estimatedUnitCost,
    purchaseRequired: prize.purchaseRequired,
    usageConditions: prize.usageConditions,
  };
}
