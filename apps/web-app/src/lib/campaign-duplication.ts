import type { Prize } from "./types";

export type DuplicatedPrizeInput = Pick<
  Prize,
  | "label"
  | "totalQuantity"
  | "probability"
  | "estimatedUnitCost"
  | "estimatedUnitCostKnown"
  | "purchaseRequired"
  | "usageConditions"
> & { id: string };

export function buildDuplicatedPrizeInput(prize: Prize, id: string): DuplicatedPrizeInput {
  return {
    id,
    label: prize.label,
    totalQuantity: prize.totalQuantity,
    probability: prize.probability,
    estimatedUnitCost: prize.estimatedUnitCost,
    ...(prize.estimatedUnitCostKnown === false ? { estimatedUnitCostKnown: false } : {}),
    purchaseRequired: prize.purchaseRequired,
    usageConditions: prize.usageConditions,
  };
}
