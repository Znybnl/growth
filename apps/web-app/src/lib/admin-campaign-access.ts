export function isAdminCampaignLocationAllowed(
  accountMerchantId: string,
  targetLocationId: string,
  associatedLocationIds: readonly string[],
) {
  return targetLocationId === accountMerchantId || associatedLocationIds.includes(targetLocationId);
}

export type AdminCampaignAudit = {
  adminUserId?: unknown;
  accountMerchantId?: unknown;
  targetLocationId?: unknown;
};

export function isAdminCreatedCampaignAccessible(
  campaignMerchantId: string,
  adminUserId: string,
  audit: AdminCampaignAudit | null | undefined,
) {
  return Boolean(
    audit &&
      audit.adminUserId === adminUserId &&
      typeof audit.accountMerchantId === "string" &&
      audit.accountMerchantId.length > 0 &&
      audit.targetLocationId === campaignMerchantId,
  );
}
