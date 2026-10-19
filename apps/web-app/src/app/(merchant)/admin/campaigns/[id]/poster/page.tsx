import { notFound, redirect } from "next/navigation";

import { PosterEditor } from "@/components/merchant/poster-editor";
import { isSaasAdminEmail } from "@/lib/admin";
import { getAdminCampaignContext } from "@/lib/admin-campaign-repository";
import { requireAuthenticatedSession } from "@/lib/auth";
import { getCampaignPerformance } from "@/lib/store";

type AdminCampaignPosterPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminCampaignPosterPage({ params }: AdminCampaignPosterPageProps) {
  const session = await requireAuthenticatedSession();
  if (!isSaasAdminEmail(session.user.email)) redirect("/");

  const { id } = await params;
  const context = await getAdminCampaignContext(id, session.user.email);
  if (!context) notFound();

  const performance = await getCampaignPerformance(id, context.location);
  if (!performance || performance.campaign.merchantId !== context.targetLocationId) notFound();

  return (
    <PosterEditor
      campaign={performance.campaign}
      prizes={performance.prizes}
      settingsEndpoint={`/api/admin/campaigns/${encodeURIComponent(id)}/poster-settings`}
      returnHref={`/admin/campaigns/${encodeURIComponent(id)}/edit`}
      adminImageTarget={{ accountMerchantId: context.accountMerchantId, locationId: context.targetLocationId }}
    />
  );
}
