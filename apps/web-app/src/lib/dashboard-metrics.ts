export function calculateCampaignConsumptionMetrics(wins: number, redeemed: number) {
  return {
    lotsUsed: redeemed,
    consumptionRate: wins > 0 ? Math.round((redeemed / wins) * 100) : 0,
  };
}
