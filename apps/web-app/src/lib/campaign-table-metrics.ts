import type { Prize } from "@/lib/types";

export type CampaignStockMetrics = {
  lotsUsed: number;
  consumptionRate: number | null;
};

export function getCampaignStockMetrics(
  prizes: Pick<Prize, "totalQuantity" | "remainingQuantity">[],
): CampaignStockMetrics {
  const totals = prizes.reduce(
    (result, prize) => {
      if (
        prize.totalQuantity === null ||
        prize.remainingQuantity === null ||
        prize.totalQuantity <= 0
      ) {
        return result;
      }

      const remainingQuantity = Math.min(
        prize.totalQuantity,
        Math.max(0, prize.remainingQuantity),
      );

      return {
        initial: result.initial + prize.totalQuantity,
        used: result.used + prize.totalQuantity - remainingQuantity,
      };
    },
    { initial: 0, used: 0 },
  );

  return {
    lotsUsed: totals.used,
    consumptionRate: totals.initial > 0 ? Math.round((totals.used / totals.initial) * 100) : null,
  };
}
