import { notFound } from "next/navigation";

import { CampaignEditor } from "@/components/merchant/campaign-editor";
import { requireAuthenticatedSession } from "@/lib/auth";
import { getCampaignSetupPerformance } from "@/lib/store";
import { CampaignPerformance } from "@/lib/types";

type CampaignEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function isInlineAsset(value?: string) {
  return Boolean(value?.startsWith("data:"));
}

function deferInlineAssets(campaign: CampaignPerformance) {
  const hasDeferredAssets = [
    campaign.campaign.logoUrl,
    campaign.campaign.presentation.background.imageUrl,
    campaign.campaign.presentation.poster.logoUrl,
    campaign.campaign.presentation.poster.backgroundImageUrl,
  ].some(isInlineAsset);

  if (!hasDeferredAssets) {
    return { campaign, hasDeferredAssets: false };
  }

  return {
    hasDeferredAssets: true,
    campaign: {
      ...campaign,
      campaign: {
        ...campaign.campaign,
        logoUrl: isInlineAsset(campaign.campaign.logoUrl) ? undefined : campaign.campaign.logoUrl,
        presentation: {
          ...campaign.campaign.presentation,
          background: {
            ...campaign.campaign.presentation.background,
            imageUrl: isInlineAsset(campaign.campaign.presentation.background.imageUrl)
              ? ""
              : campaign.campaign.presentation.background.imageUrl,
          },
          poster: {
            ...campaign.campaign.presentation.poster,
            logoUrl: isInlineAsset(campaign.campaign.presentation.poster.logoUrl)
              ? undefined
              : campaign.campaign.presentation.poster.logoUrl,
            backgroundImageUrl: isInlineAsset(campaign.campaign.presentation.poster.backgroundImageUrl)
              ? ""
              : campaign.campaign.presentation.poster.backgroundImageUrl,
          },
        },
      },
    },
  };
}

export default async function CampaignEditPage({ params }: CampaignEditPageProps) {
  const { id } = await params;
  const session = await requireAuthenticatedSession();
  const campaign = await getCampaignSetupPerformance(id, session.merchant);

  if (!campaign || campaign.campaign.merchantId !== session.merchant.id) {
    notFound();
  }

  const initialState = deferInlineAssets(campaign);

  return (
    <CampaignEditor
      merchant={session.merchant}
      initialCampaign={initialState.campaign}
      deferInlineAssets={initialState.hasDeferredAssets}
    />
  );
}
