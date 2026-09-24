export interface PrizeStockSnapshot {
  totalQuantity: number | null;
  remainingQuantity: number | null;
}

export function calculatePrizeConsumption(inventory: readonly PrizeStockSnapshot[]) {
  const totals = inventory.reduce(
    (result, item) => {
      if (
        item.totalQuantity === null ||
        item.remainingQuantity === null ||
        item.totalQuantity <= 0
      ) {
        return result;
      }

      const remainingQuantity = Math.min(
        item.totalQuantity,
        Math.max(0, item.remainingQuantity),
      );

      return {
        initial: result.initial + item.totalQuantity,
        consumed: result.consumed + item.totalQuantity - remainingQuantity,
      };
    },
    { initial: 0, consumed: 0 },
  );

  return {
    ...totals,
    rate: totals.initial > 0 ? Math.round((totals.consumed / totals.initial) * 100) : null,
  };
}
