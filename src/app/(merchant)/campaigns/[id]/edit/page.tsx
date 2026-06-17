import { notFound } from "next/navigation";

import { CampaignEditor } from "@/components/merchant/campaign-editor";
import { requireAuthenticatedSession } from "@/lib/auth";
import { getCampaignPerformance, getMerchantDashboard } from "@/lib/store";

type CampaignEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CampaignEditPage({ params }: CampaignEditPageProps) {
  const { id } = await params;
  const session = await requireAuthenticatedSession();
  const [dashboard, campaign] = await Promise.all([
    getMerchantDashboard(session.merchant.id, session.merchant),
    getCampaignPerformance(id, session.merchant),
  ]);

  if (!campaign || campaign.campaign.merchantId !== session.merchant.id) {
    notFound();
  }

  return (
    <CampaignEditor
      merchant={session.merchant}
      initialCampaign={campaign}
      campaignLibrary={dashboard.campaigns}
    />
  );
}
