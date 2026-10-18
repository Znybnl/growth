/** Preserve the historical primary-account identity across active locations. */
export function merchantAnalyticsDistinctId(accountMerchantId: string, userId: string) {
  return `${accountMerchantId}:${userId}`;
}
