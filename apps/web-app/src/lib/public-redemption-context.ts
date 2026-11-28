import type { PublicRedemptionContext } from "@/lib/types";

export type PublicRedemptionView = Pick<
  PublicRedemptionContext,
  | "status"
  | "campaignTitle"
  | "firstName"
  | "maskedEmail"
  | "prizeLabel"
  | "prizeUsageConditions"
  | "redemptionCode"
  | "rewardAvailableAt"
  | "rewardExpiresAt"
  | "purchaseRequired"
  | "redeemedAt"
  | "purchaseVerified"
  | "merchantName"
  | "merchantCity"
  | "isPreview"
>;

/** Project the server-side redemption record to fields needed by the public UI. */
export function toPublicRedemptionView(context: PublicRedemptionContext): PublicRedemptionView {
  return {
    status: context.status,
    campaignTitle: context.campaignTitle,
    firstName: context.firstName,
    maskedEmail: context.maskedEmail,
    prizeLabel: context.prizeLabel,
    prizeUsageConditions: context.prizeUsageConditions,
    redemptionCode: context.redemptionCode,
    rewardAvailableAt: context.rewardAvailableAt,
    rewardExpiresAt: context.rewardExpiresAt,
    purchaseRequired: context.purchaseRequired,
    redeemedAt: context.redeemedAt,
    purchaseVerified: context.purchaseVerified,
    merchantName: context.merchantName,
    merchantCity: context.merchantCity,
    isPreview: context.isPreview,
  };
}
