export function isAdminCampaignLocationAllowed(
  accountMerchantId: string,
  targetLocationId: string,
  associatedLocationIds: readonly string[],
) {
  return targetLocationId === accountMerchantId || associatedLocationIds.includes(targetLocationId);
}
