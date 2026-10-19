import type { PublicCampaign } from "@/lib/types";

type CampaignSocialMetadataInput = Pick<
  PublicCampaign,
  "merchantName" | "subtitle" | "gameType" | "presentation"
>;

export function getCampaignSocialMetadata(
  campaign: CampaignSocialMetadataInput,
  fallbackTitle: string,
  fallbackDescription: string,
) {
  const title = [campaign.merchantName.trim(), campaign.subtitle.trim()]
    .filter(Boolean)
    .join(" — ");
  const secondaryText = campaign.gameType === "wheel"
    ? campaign.presentation.layout.wheelSubtitle
    : campaign.presentation.layout.scratchSubtitle;

  return {
    title: title || fallbackTitle,
    description: secondaryText?.trim() || fallbackDescription,
  };
}
