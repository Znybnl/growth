import { notFound, redirect } from "next/navigation";

import { CampaignWizard } from "@/components/merchant/campaign-wizard";
import { isSaasAdminEmail } from "@/lib/admin";
import { getAdminCreatedCampaignContext } from "@/lib/admin-campaign-repository";
import { requireAuthenticatedSession } from "@/lib/auth";
import { getCampaignSetupPerformance } from "@/lib/store";
import type { CampaignPerformance } from "@/lib/types";

type AdminCampaignEditPageProps = {
  params: Promise<{ id: string }>;
};

function isInlineAsset(value?: string) {
  return Boolean(value?.startsWith("data:"));
}

function deferInlineAssets(campaign: CampaignPerformance) {
  const { background, poster } = campaign.campaign.presentation;
  const hasDeferredAssets = [background.imageUrl, poster.logoUrl, poster.backgroundImageUrl].some(isInlineAsset);

  if (!hasDeferredAssets) return { campaign, hasDeferredAssets: false };

  return {
    hasDeferredAssets: true,
    campaign: {
      ...campaign,
      campaign: {
        ...campaign.campaign,
        presentation: {
          ...campaign.campaign.presentation,
          background: {
            ...background,
            imageUrl: isInlineAsset(background.imageUrl) ? "" : background.imageUrl,
          },
          poster: {
            ...poster,
            logoUrl: isInlineAsset(poster.logoUrl) ? undefined : poster.logoUrl,
            backgroundImageUrl: isInlineAsset(poster.backgroundImageUrl) ? "" : poster.backgroundImageUrl,
          },
        },
      },
    },
  };
}

export default async function AdminCampaignEditPage({ params }: AdminCampaignEditPageProps) {
  const session = await requireAuthenticatedSession();
  if (!isSaasAdminEmail(session.user.email)) redirect("/");

  const { id } = await params;
  const context = await getAdminCreatedCampaignContext(id, session.user.id);
  if (!context) notFound();

  const campaign = await getCampaignSetupPerformance(id, context.location);
  if (!campaign || campaign.campaign.merchantId !== context.targetLocationId) notFound();

  const initialState = deferInlineAssets(campaign);
  const saveEndpoint = `/api/admin/merchants/${encodeURIComponent(context.accountMerchantId)}/locations/${encodeURIComponent(context.targetLocationId)}/campaigns/setup`;

  return (
    <CampaignWizard
      merchant={context.location}
      initialCampaign={initialState.campaign}
      deferInlineAssets={initialState.hasDeferredAssets}
      adminSaveEndpoint={saveEndpoint}
      adminAssetsEndpoint={`/api/admin/campaigns/${encodeURIComponent(id)}/assets`}
    />
  );
}
