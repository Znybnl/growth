import { wizardMarketingActionUrl } from "./wizard-marketing-actions.mjs";
import type { CampaignPerformance, CampaignSetupInput, Merchant } from "@/lib/types";

/** Copy configuration only, never participation, gains, current stock or source IDs. */
export function buildAdminCampaignCopy(
  source: CampaignPerformance,
  sourceMerchant: Merchant,
  target: Merchant,
  adminUserId: string,
  accountMerchantId: string,
  adaptMerchantIdentity: boolean,
): CampaignSetupInput {
  const campaign = source.campaign;
  const presentation = structuredClone(campaign.presentation);
  const actions = campaign.actions.flatMap((action) => {
    const url = adaptMerchantIdentity
      ? action.kind === "custom" && sourceMerchant.appointmentUrl && action.url === sourceMerchant.appointmentUrl
        ? target.appointmentUrl?.trim() || ""
        : wizardMarketingActionUrl(target, action.kind)
      : action.url;
    return url ? [{ ...action, id: `action-${crypto.randomUUID()}`, url }] : [];
  });
  const logoText = target.logoText || target.companyName;
  const logoMode = campaign.logoMode === "none" ? "none"
    : campaign.logoMode === "image" && target.logoUrl ? "image" : "text";
  if (adaptMerchantIdentity) {
    presentation.poster.logoText = logoText;
    presentation.poster.logoUrl = target.logoUrl;
    if (presentation.poster.logoMode !== "none") {
      presentation.poster.logoMode = presentation.poster.logoMode === "image" && target.logoUrl ? "image" : "text";
    }
    presentation.email.senderName = "{{merchantName}}";
    presentation.email.replyTo = target.restaurantEmail?.trim() || "";
  }
  return {
    merchantId: target.id,
    adminCreationAudit: { adminUserId, accountMerchantId },
    title: `${campaign.title} · ${target.city || target.companyName}`,
    subtitle: campaign.subtitle,
    goalType: campaign.goalType,
    emailCaptureEnabled: campaign.emailCaptureEnabled,
    ctaLabel: campaign.ctaLabel,
    successMetric: campaign.successMetric,
    targetUrl: adaptMerchantIdentity ? actions[0]?.url : campaign.targetUrl,
    isActive: false,
    accent: structuredClone(campaign.accent),
    gameType: campaign.gameType,
    logoMode: adaptMerchantIdentity ? logoMode : campaign.logoMode,
    logoText: adaptMerchantIdentity ? logoText : campaign.logoText,
    logoUrl: adaptMerchantIdentity ? target.logoUrl : campaign.logoUrl,
    presentation,
    actions,
    rewardRules: structuredClone(campaign.rewardRules),
    prizes: source.prizes.map((prize) => ({
      label: prize.label,
      totalQuantity: prize.totalQuantity,
      probability: prize.probability,
      estimatedUnitCost: prize.estimatedUnitCost,
      purchaseRequired: prize.purchaseRequired,
      usageConditions: prize.usageConditions,
    })),
  };
}
