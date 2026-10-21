import type { CampaignSetupInput } from "@/lib/types";

export type ReusablePrize = {
  id: string;
  sourceCampaignId: string;
  sourceCampaignTitle: string;
  lastUsedAt: string;
  label: string;
  probability: number;
  estimatedUnitCost: number;
  estimatedUnitCostKnown?: boolean;
  totalQuantity: number | null;
  purchaseRequired: boolean;
  usageConditions: string;
};

type PrizeFields = Pick<ReusablePrize, "label" | "probability" | "estimatedUnitCost" | "estimatedUnitCostKnown" | "totalQuantity" | "purchaseRequired" | "usageConditions">;
const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");

/** Same configuration, not merely the same name. Never merge different conditions or stocks. */
export function reusablePrizeKey(prize: PrizeFields) {
  return JSON.stringify([normalize(prize.label), normalize(prize.usageConditions), prize.probability,
    prize.estimatedUnitCost, prize.estimatedUnitCostKnown !== false, prize.totalQuantity, prize.purchaseRequired]);
}

export function deduplicateReusablePrizes(prizes: ReusablePrize[]) {
  const sorted = [...prizes].sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt) || a.id.localeCompare(b.id));
  const unique = new Map<string, ReusablePrize>();
  for (const prize of sorted) {
    const key = reusablePrizeKey(prize);
    if (!unique.has(key)) unique.set(key, prize);
  }
  return [...unique.values()];
}

export function isReusablePrizeAdded(prize: ReusablePrize, prizes: CampaignSetupInput["prizes"], sourceCopies?: ReadonlyMap<string, string>) {
  return prizes.some((item) => Boolean(item.id && sourceCopies?.get(prize.id) === item.id)
    || reusablePrizeKey({ ...item, purchaseRequired: Boolean(item.purchaseRequired), usageConditions: item.usageConditions ?? "" }) === reusablePrizeKey(prize));
}

export function copyReusablePrize(prize: ReusablePrize, scope: string, probability: number, quantity: number | null) {
  return {
    // Never concatenate an old ID: recursively copied IDs would exceed the API's 120-character limit.
    id: `${scope}-previous-${crypto.randomUUID()}`,
    label: prize.label,
    probability,
    estimatedUnitCost: prize.estimatedUnitCost,
    estimatedUnitCostKnown: prize.estimatedUnitCostKnown,
    usageConditions: prize.usageConditions,
    purchaseRequired: prize.purchaseRequired,
    totalQuantity: quantity,
    remainingQuantity: quantity,
  };
}
